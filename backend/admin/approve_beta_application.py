import json
import logging
import os

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
beta_applications_table = dynamodb.Table(
    os.environ["BETA_APPLICATIONS_TABLE"]
)

lambda_client = boto3.client("lambda")

PROVISIONING_FUNCTION_NAME = os.environ[
    "PROVISIONING_FUNCTION_NAME"
]

PLATFORM_ADMIN_GROUP = "PlatformAdmins"


def api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }


def get_jwt_claims(event):
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    return claims if isinstance(claims, dict) else {}


def get_cognito_groups(event):
    claims = get_jwt_claims(event)
    groups = claims.get("cognito:groups")

    if isinstance(groups, list):
        return {
            group.strip()
            for group in groups
            if isinstance(group, str) and group.strip()
        }

    if not isinstance(groups, str):
        return set()

    value = groups.strip()

    if not value:
        return set()

    if value.startswith("[") and value.endswith("]"):
        value = value[1:-1]

    normalized = value.replace(",", " ")

    return {
        group.strip().strip('"').strip("'")
        for group in normalized.split()
        if group.strip()
    }


def is_platform_admin(event):
    return PLATFORM_ADMIN_GROUP in get_cognito_groups(event)


def get_application(application_id):
    response = beta_applications_table.get_item(
        Key={"applicationId": application_id},
        ConsistentRead=True,
    )

    return response.get("Item")


def invoke_provisioning(application_id):
    payload = json.dumps(
        {
            "applicationId": application_id,
        }
    ).encode("utf-8")

    response = lambda_client.invoke(
        FunctionName=PROVISIONING_FUNCTION_NAME,
        InvocationType="RequestResponse",
        Payload=payload,
    )

    raw_payload = response["Payload"].read()

    if response.get("FunctionError"):
        raise RuntimeError(
            "Provisioning Lambda returned a function error."
        )

    if not raw_payload:
        raise RuntimeError(
            "Provisioning Lambda returned an empty response."
        )

    return json.loads(raw_payload.decode("utf-8"))


def lambda_handler(event, context):
    try:
        if not is_platform_admin(event):
            logger.warning(
                "Platform admin approval authorization denied"
            )

            return api_response(
                403,
                {
                    "message":
                        "Platform administrator access required."
                },
            )

        path_parameters = event.get("pathParameters") or {}
        application_id = str(
            path_parameters.get("applicationId") or ""
        ).strip()

        if not application_id:
            return api_response(
                400,
                {
                    "message": "Application ID is required."
                },
            )

        application = get_application(application_id)

        if application is None:
            return api_response(
                404,
                {
                    "message": "Beta application not found."
                },
            )

        status = str(application.get("status") or "").strip()

        if status == "provisioned":
            return api_response(
                200,
                {
                    "message": "Application is already provisioned.",
                    "application": application,
                },
            )

        if status not in {"submitted", "provisioning"}:
            return api_response(
                409,
                {
                    "message":
                        "Application cannot be approved "
                        f"from status '{status}'."
                },
            )

        logger.info(
            "Platform admin approving beta application %s",
            application_id,
        )

        provisioning_result = invoke_provisioning(
            application_id
        )

        result_status = provisioning_result.get("status")

        if result_status not in {
            "provisioned",
            "already_provisioned",
        }:
            logger.error(
                "Unexpected provisioning result for %s: %r",
                application_id,
                provisioning_result,
            )

            return api_response(
                500,
                {
                    "message":
                        "Application provisioning did not complete.",
                },
            )

        current = get_application(application_id)

        logger.info(
            "Platform admin provisioning completed for %s",
            application_id,
        )

        return api_response(
            200,
            {
                "message": "Application approved and provisioned.",
                "application": current,
            },
        )

    except ClientError:
        logger.exception(
            "AWS error while approving beta application"
        )

        return api_response(
            500,
            {
                "message": "Unable to approve beta application."
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error while approving beta application"
        )

        return api_response(
            500,
            {
                "message": "Internal server error."
            },
        )
