import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError


dynamodb = boto3.resource("dynamodb")

applications_table = dynamodb.Table(
    os.environ["BETA_APPLICATIONS_TABLE"]
)
companies_table = dynamodb.Table(
    os.environ["COMPANIES_TABLE"]
)

cognito = boto3.client("cognito-idp")

user_pool_id = os.environ["COGNITO_USER_POOL_ID"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def log(level, event, **fields):
    print(
        json.dumps(
            {
                "level": level,
                "event": event,
                **fields,
            }
        )
    )


def result(status, **fields):
    return {
        "status": status,
        **fields,
    }


def clean_string(value):
    if not isinstance(value, str):
        return ""
    return value.strip()


def get_application_id(event):
    if not isinstance(event, dict):
        return ""

    return clean_string(event.get("applicationId"))


def get_application(application_id):
    response = applications_table.get_item(
        Key={"applicationId": application_id},
        ConsistentRead=True,
    )

    return response.get("Item")


def claim_application(application):
    application_id = application["applicationId"]
    company_id = f"company-{uuid.uuid4()}"
    now = now_iso()

    try:
        applications_table.update_item(
            Key={"applicationId": application_id},
            UpdateExpression=(
                "SET #status = :provisioning, "
                "companyId = :company_id, "
                "provisioningStartedAt = :started_at, "
                "updatedAt = :updated_at"
            ),
            ConditionExpression=(
                "#status = :submitted "
                "AND attribute_not_exists(companyId)"
            ),
            ExpressionAttributeNames={
                "#status": "status",
            },
            ExpressionAttributeValues={
                ":submitted": "submitted",
                ":provisioning": "provisioning",
                ":company_id": company_id,
                ":started_at": now,
                ":updated_at": now,
            },
        )

        log(
            "INFO",
            "beta_provisioning_started",
            applicationId=application_id,
            companyId=company_id,
        )

        claimed = get_application(application_id)

        if not claimed:
            raise RuntimeError(
                "Application disappeared after provisioning claim."
            )

        return claimed

    except ClientError as exc:
        error_code = (
            exc.response
            .get("Error", {})
            .get("Code", "Unknown")
        )

        if error_code != "ConditionalCheckFailedException":
            raise

        # Another invocation may have claimed the application.
        # Re-read the authoritative state and reconcile against it.
        current = get_application(application_id)

        if not current:
            raise RuntimeError(
                "Application disappeared during provisioning claim."
            )

        return current


def ensure_company(application):
    application_id = application["applicationId"]
    company_id = clean_string(application.get("companyId"))

    business_name = clean_string(
        application.get("businessName")
    )
    contact_name = clean_string(
        application.get("contactName")
    )
    email = clean_string(
        application.get("email")
    ).lower()

    if not company_id:
        raise RuntimeError(
            "Provisioning application has no companyId."
        )

    response = companies_table.get_item(
        Key={"companyId": company_id},
        ConsistentRead=True,
    )

    existing = response.get("Item")

    if existing:
        if (
            clean_string(existing.get("betaApplicationId"))
            != application_id
        ):
            raise RuntimeError(
                "Existing company belongs to another "
                "beta application."
            )

        if (
            clean_string(existing.get("primaryContactEmail")).lower()
            != email
        ):
            raise RuntimeError(
                "Existing company email does not match "
                "the beta application."
            )

        log(
            "INFO",
            "beta_provisioning_company_verified",
            applicationId=application_id,
            companyId=company_id,
        )

        return existing

    now = now_iso()

    company_item = {
        "companyId": company_id,
        "businessName": business_name,
        "primaryContactName": contact_name,
        "primaryContactEmail": email,
        "status": "active",
        "plan": "founding-beta",
        "betaApplicationId": application_id,
        "onboardingStatus": "invited",
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        companies_table.put_item(
            Item=company_item,
            ConditionExpression=(
                "attribute_not_exists(companyId)"
            ),
        )

        log(
            "INFO",
            "beta_provisioning_company_created",
            applicationId=application_id,
            companyId=company_id,
        )

        return company_item

    except ClientError as exc:
        error_code = (
            exc.response
            .get("Error", {})
            .get("Code", "Unknown")
        )

        if error_code != "ConditionalCheckFailedException":
            raise

        # Concurrent invocation may have created it.
        response = companies_table.get_item(
            Key={"companyId": company_id},
            ConsistentRead=True,
        )

        existing = response.get("Item")

        if not existing:
            raise RuntimeError(
                "Company creation raced but no company exists."
            )

        if (
            clean_string(existing.get("betaApplicationId"))
            != application_id
        ):
            raise RuntimeError(
                "Concurrent company belongs to another "
                "beta application."
            )

        if (
            clean_string(existing.get("primaryContactEmail")).lower()
            != email
        ):
            raise RuntimeError(
                "Concurrent company email does not match "
                "the beta application."
            )

        log(
            "INFO",
            "beta_provisioning_company_verified",
            applicationId=application_id,
            companyId=company_id,
        )

        return existing


def get_cognito_attributes(user):
    return {
        attribute["Name"]: attribute.get("Value", "")
        for attribute in user.get("UserAttributes", [])
    }


def verify_cognito_user(
    user,
    application_id,
    company_id,
    email,
):
    attributes = get_cognito_attributes(user)

    existing_company_id = clean_string(
        attributes.get("custom:companyId")
    )

    existing_role = clean_string(
        attributes.get("custom:role")
    )

    existing_email = clean_string(
        attributes.get("email")
    ).lower()

    if existing_company_id != company_id:
        raise RuntimeError(
            "Existing Cognito user belongs to another company."
        )

    if existing_role != "owner":
        raise RuntimeError(
            "Existing Cognito user does not have owner role."
        )

    if existing_email != email:
        raise RuntimeError(
            "Existing Cognito user email does not match."
        )

    log(
        "INFO",
        "beta_provisioning_user_verified",
        applicationId=application_id,
        companyId=company_id,
        username=user.get("Username"),
    )


def ensure_cognito_user(application):
    application_id = application["applicationId"]
    company_id = clean_string(application.get("companyId"))
    email = clean_string(
        application.get("email")
    ).lower()

    try:
        user = cognito.admin_get_user(
            UserPoolId=user_pool_id,
            Username=email,
        )

        verify_cognito_user(
            user,
            application_id,
            company_id,
            email,
        )

        return user

    except cognito.exceptions.UserNotFoundException:
        pass

    try:
        cognito.admin_create_user(
            UserPoolId=user_pool_id,
            Username=email,
            UserAttributes=[
                {
                    "Name": "email",
                    "Value": email,
                },
                {
                    "Name": "custom:companyId",
                    "Value": company_id,
                },
                {
                    "Name": "custom:role",
                    "Value": "owner",
                },
            ],
            DesiredDeliveryMediums=["EMAIL"],
        )

        log(
            "INFO",
            "beta_provisioning_user_created",
            applicationId=application_id,
            companyId=company_id,
        )

    except cognito.exceptions.UsernameExistsException:
        # Concurrent invocation may have created the user.
        pass

    user = cognito.admin_get_user(
        UserPoolId=user_pool_id,
        Username=email,
    )

    verify_cognito_user(
        user,
        application_id,
        company_id,
        email,
    )

    return user


def finalize_application(application):
    application_id = application["applicationId"]
    company_id = clean_string(application.get("companyId"))
    now = now_iso()

    try:
        applications_table.update_item(
            Key={"applicationId": application_id},
            UpdateExpression=(
                "SET #status = :provisioned, "
                "provisionedAt = :provisioned_at, "
                "updatedAt = :updated_at"
            ),
            ConditionExpression=(
                "#status = :provisioning "
                "AND companyId = :company_id"
            ),
            ExpressionAttributeNames={
                "#status": "status",
            },
            ExpressionAttributeValues={
                ":provisioning": "provisioning",
                ":provisioned": "provisioned",
                ":company_id": company_id,
                ":provisioned_at": now,
                ":updated_at": now,
            },
        )

        return

    except ClientError as exc:
        error_code = (
            exc.response
            .get("Error", {})
            .get("Code", "Unknown")
        )

        if error_code != "ConditionalCheckFailedException":
            raise

    # Another invocation may have completed it.
    current = get_application(application_id)

    if (
        current
        and current.get("status") == "provisioned"
        and clean_string(current.get("companyId"))
        == company_id
    ):
        return

    raise RuntimeError(
        "Unable to finalize provisioning application."
    )


def lambda_handler(event, context):
    application_id = get_application_id(event)

    if not application_id:
        return result(
            "error",
            message="applicationId is required.",
        )

    try:
        application = get_application(application_id)

        if not application:
            return result(
                "not_found",
                applicationId=application_id,
                message="Beta application not found.",
            )

        status = clean_string(application.get("status"))
        company_id = clean_string(
            application.get("companyId")
        )

        if status == "provisioned" and company_id:
            log(
                "INFO",
                "beta_application_already_provisioned",
                applicationId=application_id,
                companyId=company_id,
            )

            return result(
                "already_provisioned",
                applicationId=application_id,
                companyId=company_id,
            )

        if status == "submitted":
            business_name = clean_string(
                application.get("businessName")
            )
            contact_name = clean_string(
                application.get("contactName")
            )
            email = clean_string(
                application.get("email")
            ).lower()

            if (
                not business_name
                or not contact_name
                or not email
            ):
                return result(
                    "invalid_application",
                    applicationId=application_id,
                    message=(
                        "Application is missing required "
                        "provisioning fields."
                    ),
                )

            application = claim_application(application)

            status = clean_string(
                application.get("status")
            )
            company_id = clean_string(
                application.get("companyId")
            )

        if status == "provisioned" and company_id:
            return result(
                "already_provisioned",
                applicationId=application_id,
                companyId=company_id,
            )

        if status != "provisioning" or not company_id:
            return result(
                "invalid_status",
                applicationId=application_id,
                currentStatus=status,
                message=(
                    "Application must be submitted or "
                    "provisioning before provisioning."
                ),
            )

        log(
            "INFO",
            "beta_provisioning_resumed",
            applicationId=application_id,
            companyId=company_id,
        )

        ensure_company(application)
        ensure_cognito_user(application)
        finalize_application(application)

        email = clean_string(
            application.get("email")
        ).lower()

        log(
            "INFO",
            "beta_application_provisioned",
            applicationId=application_id,
            companyId=company_id,
        )

        return result(
            "provisioned",
            applicationId=application_id,
            companyId=company_id,
            email=email,
        )

    except (ClientError, RuntimeError) as exc:
        error_code = type(exc).__name__

        if isinstance(exc, ClientError):
            error_code = (
                exc.response
                .get("Error", {})
                .get("Code", "Unknown")
            )

        log(
            "ERROR",
            "beta_provisioning_failed",
            applicationId=application_id,
            errorCode=error_code,
            message=str(exc),
        )

        return result(
            "error",
            applicationId=application_id,
            message="Unable to provision beta application.",
        )
