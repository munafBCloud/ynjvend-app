import json
import logging
import os
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


def decimal_default(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)

    raise TypeError(
        f"Object of type {type(value).__name__} "
        "is not JSON serializable"
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

    return company_id.strip(), user_id.strip()


def lambda_handler(event, context):
    try:
        company_id, completed_by = get_identity(event)

        if not company_id:
            return response(
                403,
                {"message": "Company access could not be verified."},
            )

        if not completed_by:
            return response(
                403,
                {"message": "Authenticated user could not be verified."},
            )

        path_parameters = event.get("pathParameters") or {}

        session_id = str(
            path_parameters.get("sessionId", "")
        ).strip()

        if not session_id:
            return response(
                400,
                {"message": "sessionId is required."},
            )

        if len(session_id) > 100:
            return response(
                400,
                {"message": "sessionId cannot exceed 100 characters."},
            )

        completed_at = datetime.now(
            timezone.utc
        ).isoformat()

        result = sessions_table.update_item(
            Key={
                "companyId": company_id,
                "sessionId": session_id,
            },
            UpdateExpression=(
                "SET #status = :completed, "
                "completedAt = :completedAt, "
                "completedBy = :completedBy, "
                "updatedAt = :updatedAt"
            ),
            ConditionExpression=(
                "attribute_exists(companyId) "
                "AND attribute_exists(sessionId) "
                "AND #status = :open"
            ),
            ExpressionAttributeNames={
                "#status": "status",
            },
            ExpressionAttributeValues={
                ":completed": "COMPLETED",
                ":open": "OPEN",
                ":completedAt": completed_at,
                ":completedBy": completed_by,
                ":updatedAt": completed_at,
            },
            ReturnValues="ALL_NEW",
        )

        session = result.get("Attributes", {})

        logger.info(
            "Receiving session completed: companyId=%s sessionId=%s",
            company_id,
            session_id,
        )

        return response(
            200,
            {
                "message": "Receiving session completed.",
                "session": session,
            },
        )

    except ClientError as error:
        error_code = (
            error.response
            .get("Error", {})
            .get("Code", "")
        )

        if error_code == "ConditionalCheckFailedException":
            existing = sessions_table.get_item(
                Key={
                    "companyId": company_id,
                    "sessionId": session_id,
                },
                ConsistentRead=True,
            ).get("Item")

            if not existing:
                return response(
                    404,
                    {"message": "Receiving session not found."},
                )

            return response(
                409,
                {"message": "Receiving session is not open."},
            )

        logger.exception(
            "DynamoDB error completing receiving session"
        )

        return response(
            500,
            {"message": "Unable to complete receiving session."},
        )

    except Exception:
        logger.exception(
            "Unexpected error completing receiving session"
        )

        return response(
            500,
            {"message": "Unable to complete receiving session."},
        )
