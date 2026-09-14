import json
import logging
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["COMPANIES_TABLE"])

EDITABLE_FIELDS = {
    "businessName",
    "primaryContactName",
    "phone",
    "address",
    "city",
    "state",
    "postalCode",
}

FIELD_LIMITS = {
    "businessName": 120,
    "primaryContactName": 120,
    "phone": 40,
    "address": 200,
    "city": 100,
    "state": 100,
    "postalCode": 20,
}

REQUIRED_FIELDS = {
    "businessName",
    "primaryContactName",
}


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }


def get_company_id(event):
    try:
        claims = (
            event["requestContext"]
            ["authorizer"]
            ["jwt"]
            ["claims"]
        )

        company_id = claims.get("custom:companyId", "")

        if not isinstance(company_id, str):
            return ""

        return company_id.strip()

    except (KeyError, TypeError, AttributeError):
        return ""


def clean_string(value):
    if value is None:
        return ""

    return str(value).strip()


def lambda_handler(event, context):
    company_id = get_company_id(event)

    if not company_id:
        logger.warning(
            "Authenticated request is missing custom:companyId"
        )

        return response(
            403,
            {
                "message": (
                    "Your account is not assigned to a company"
                )
            },
        )

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(
            400,
            {"message": "Request body must contain valid JSON"},
        )

    if not isinstance(body, dict):
        return response(
            400,
            {"message": "Request body must be a JSON object"},
        )

    unexpected_fields = sorted(
        set(body.keys()) - EDITABLE_FIELDS
    )

    if unexpected_fields:
        return response(
            400,
            {
                "message": "Unexpected fields were provided.",
                "fields": unexpected_fields,
            },
        )

    values = {
        field: clean_string(body.get(field))
        for field in EDITABLE_FIELDS
        if field in body
    }

    missing_required = sorted(
        field
        for field in REQUIRED_FIELDS
        if not values.get(field)
    )

    if missing_required:
        return response(
            400,
            {
                "message": "Required company fields are missing.",
                "fields": missing_required,
            },
        )

    for field, value in values.items():
        limit = FIELD_LIMITS[field]

        if len(value) > limit:
            return response(
                400,
                {
                    "message": (
                        f"{field} cannot exceed "
                        f"{limit} characters."
                    )
                },
            )

    now = datetime.now(timezone.utc).isoformat()

    expression_names = {
        "#onboardingStatus": "onboardingStatus",
        "#setupCompletedAt": "setupCompletedAt",
        "#updatedAt": "updatedAt",
    }

    expression_values = {
        ":complete": "complete",
        ":setupCompletedAt": now,
        ":updatedAt": now,
    }

    set_expressions = [
        "#onboardingStatus = :complete",
        "#setupCompletedAt = :setupCompletedAt",
        "#updatedAt = :updatedAt",
    ]

    for index, (field, value) in enumerate(values.items()):
        name_key = f"#field{index}"
        value_key = f":value{index}"

        expression_names[name_key] = field
        expression_values[value_key] = value

        set_expressions.append(
            f"{name_key} = {value_key}"
        )

    try:
        result = table.update_item(
            Key={"companyId": company_id},
            UpdateExpression=(
                "SET " + ", ".join(set_expressions)
            ),
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values,
            ConditionExpression="attribute_exists(companyId)",
            ReturnValues="ALL_NEW",
        )

        logger.info(
            "Company onboarding completed for company %s",
            company_id,
        )

        return response(
            200,
            {
                "message": "Company setup completed",
                "company": result["Attributes"],
            },
        )

    except ClientError as error:
        error_code = error.response["Error"]["Code"]

        if error_code == "ConditionalCheckFailedException":
            return response(
                404,
                {"message": "Company profile not found"},
            )

        logger.exception(
            "DynamoDB error while updating company onboarding"
        )

        return response(
            500,
            {"message": "Unable to update company setup"},
        )

    except Exception:
        logger.exception(
            "Unexpected error while updating company onboarding"
        )

        return response(
            500,
            {"message": "Internal server error"},
        )
