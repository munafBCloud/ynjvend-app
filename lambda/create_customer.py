import json
import logging
import os
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["CUSTOMERS_TABLE"])

ALLOWED_FIELDS = {
    "businessName",
    "contactName",
    "phone",
    "locationAddress",
}

REQUIRED_FIELDS = {
    "businessName",
    "contactName",
    "phone",
    "locationAddress",
}

TEXT_LIMITS = {
    "businessName": 150,
    "contactName": 100,
    "phone": 30,
    "locationAddress": 300,
}


def api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }


def get_jwt_claims(event):
    return (
        event
        .get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )


def get_company_id(event):
    claims = get_jwt_claims(event)

    company_id = claims.get("custom:companyId")

    if not isinstance(company_id, str):
        return None

    company_id = company_id.strip()

    return company_id or None


def validate_text(body, field, maximum_length):
    value = body.get(field)

    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")

    value = value.strip()

    if not value:
        raise ValueError(f"{field} is required")

    if len(value) > maximum_length:
        raise ValueError(
            f"{field} must be no more than "
            f"{maximum_length} characters"
        )

    return value


def lambda_handler(event, context):
    try:
        company_id = get_company_id(event)

        if not company_id:
            logger.warning(
                "Authenticated request is missing custom:companyId"
            )

            return api_response(
                403,
                {
                    "message": (
                        "Your account is not assigned to a company"
                    )
                }
            )

        raw_body = event.get("body")

        if not raw_body:
            return api_response(
                400,
                {"message": "Request body is required"}
            )

        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            return api_response(
                400,
                {"message": "Request body must contain valid JSON"}
            )

        if not isinstance(body, dict):
            return api_response(
                400,
                {"message": "Request body must be a JSON object"}
            )

        missing_fields = sorted(
            field
            for field in REQUIRED_FIELDS
            if field not in body or body[field] in (None, "")
        )

        if missing_fields:
            return api_response(
                400,
                {
                    "message": "Missing required fields",
                    "fields": missing_fields,
                }
            )

        unexpected_fields = sorted(
            set(body.keys()) - ALLOWED_FIELDS
        )

        if unexpected_fields:
            return api_response(
                400,
                {
                    "message": "Unexpected fields were provided",
                    "fields": unexpected_fields,
                }
            )

        validated_customer = {
            field: validate_text(body, field, limit)
            for field, limit in TEXT_LIMITS.items()
        }

        now = datetime.now(timezone.utc).isoformat()

        customer = {
            "companyId": company_id,
            "customerId": str(uuid.uuid4()),
            "businessName": validated_customer["businessName"],
            "contactName": validated_customer["contactName"],
            "phone": validated_customer["phone"],
            "locationAddress": validated_customer[
                "locationAddress"
            ],
            "status": "active",
            "createdAt": now,
            "updatedAt": now,
        }

        table.put_item(
            Item=customer,
            ConditionExpression=(
                "attribute_not_exists(companyId) "
                "AND attribute_not_exists(customerId)"
            ),
        )

        logger.info(
            "Created customer %s for company %s",
            customer["customerId"],
            company_id,
        )

        return api_response(
            201,
            {
                "message": "Customer created successfully",
                "customer": customer,
            }
        )

    except ValueError as error:
        return api_response(
            400,
            {"message": str(error)}
        )

    except ClientError:
        logger.exception(
            "DynamoDB error while creating customer"
        )

        return api_response(
            500,
            {"message": "Unable to create customer"}
        )

    except Exception:
        logger.exception(
            "Unexpected error while creating customer"
        )

        return api_response(
            500,
            {"message": "Internal server error"}
        )
