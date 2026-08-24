import json
import logging
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
sessions_table = dynamodb.Table(
    os.environ["INVENTORY_RECEIVING_SESSIONS_TABLE"]
)

ALLOWED_FIELDS = {
    "reference",
    "notes",
}


def decimal_default(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)

    raise TypeError(
        f"Object of type {type(value).__name__} is not JSON serializable"
    )


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(
            body,
            default=decimal_default,
        ),
    }


def get_jwt_claims(event):
    try:
        return (
            event["requestContext"]
            ["authorizer"]
            ["jwt"]
            ["claims"]
        )
    except (KeyError, TypeError):
        return {}


def get_identity(event):
    claims = get_jwt_claims(event)

    company_id = claims.get("custom:companyId", "")
    user_id = claims.get("sub", "")

    if not isinstance(company_id, str):
        company_id = ""

    if not isinstance(user_id, str):
        user_id = ""

    return (
        company_id.strip(),
        user_id.strip(),
    )


def clean_optional_text(value, field_name, maximum_length):
    if value is None:
        return ""

    if not isinstance(value, str):
        raise ValueError(
            f"{field_name} must be a string"
        )

    value = value.strip()

    if len(value) > maximum_length:
        raise ValueError(
            f"{field_name} cannot exceed {maximum_length} characters"
        )

    return value


def lambda_handler(event, context):
    try:
        company_id, started_by = get_identity(event)

        if not company_id:
            return response(
                403,
                {
                    "message": "Company access could not be verified."
                },
            )

        if not started_by:
            return response(
                403,
                {
                    "message": "Authenticated user could not be verified."
                },
            )

        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return response(
                400,
                {
                    "message": "Request body must contain valid JSON."
                },
            )

        if not isinstance(body, dict):
            return response(
                400,
                {
                    "message": "Request body must be a JSON object."
                },
            )

        unexpected_fields = sorted(
            set(body.keys()) - ALLOWED_FIELDS
        )

        if unexpected_fields:
            return response(
                400,
                {
                    "message": "Unexpected fields were provided.",
                    "fields": unexpected_fields,
                },
            )

        try:
            reference = clean_optional_text(
                body.get("reference"),
                "reference",
                100,
            )

            notes = clean_optional_text(
                body.get("notes"),
                "notes",
                500,
            )

        except ValueError as error:
            return response(
                400,
                {
                    "message": str(error)
                },
            )

        started_at = datetime.now(
            timezone.utc
        ).isoformat()

        session_id = f"rcvsess-{uuid.uuid4()}"

        item = {
            "companyId": company_id,
            "sessionId": session_id,
            "status": "OPEN",
            "startedAt": started_at,
            "startedBy": started_by,
            "receiptCount": 0,
            "totalUnitsReceived": 0,
        }

        if reference:
            item["reference"] = reference

        if notes:
            item["notes"] = notes

        sessions_table.put_item(
            Item=item,
            ConditionExpression=(
                "attribute_not_exists(companyId) "
                "AND attribute_not_exists(sessionId)"
            ),
        )

        logger.info(
            "Receiving session started: companyId=%s sessionId=%s",
            company_id,
            session_id,
        )

        return response(
            201,
            {
                "message": "Receiving session created.",
                "session": item,
            },
        )

    except ClientError as error:
        error_code = (
            error.response
            .get("Error", {})
            .get("Code", "")
        )

        if error_code == "ConditionalCheckFailedException":
            return response(
                409,
                {
                    "message": "Receiving session already exists."
                },
            )

        logger.exception(
            "DynamoDB error creating receiving session"
        )

        return response(
            500,
            {
                "message": "Unable to create receiving session."
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error creating receiving session"
        )

        return response(
            500,
            {
                "message": "Unable to create receiving session."
            },
        )
