import json
import logging
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["REQUESTS_TABLE"])

ALLOWED_FIELDS = {
    "customerId",
    "businessName",
    "productId",
    "productName",
    "quantityRequested",
}

REQUIRED_FIELDS = {
    "customerId",
    "businessName",
    "productId",
    "productName",
    "quantityRequested",
}

TEXT_LIMITS = {
    "customerId": 100,
    "businessName": 150,
    "productId": 100,
    "productName": 200,
}


def api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }


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


def validate_quantity(value):
    if isinstance(value, bool):
        raise ValueError(
            "quantityRequested must be a whole number"
        )

    try:
        quantity = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(
            "quantityRequested must be a whole number"
        )

    if quantity != quantity.to_integral_value():
        raise ValueError(
            "quantityRequested must be a whole number"
        )

    quantity = int(quantity)

    if quantity < 1 or quantity > 1000:
        raise ValueError(
            "quantityRequested must be between 1 and 1000"
        )

    return quantity


def lambda_handler(event, context):
    try:
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

        validated_text = {
            field: validate_text(body, field, limit)
            for field, limit in TEXT_LIMITS.items()
        }

        quantity = validate_quantity(
            body["quantityRequested"]
        )

        request_item = {
            "requestId": str(uuid.uuid4()),
            "customerId": validated_text["customerId"],
            "businessName": validated_text["businessName"],
            "productId": validated_text["productId"],
            "productName": validated_text["productName"],
            "quantityRequested": quantity,
            "status": "New",
            "requestedAt": datetime.now(
                timezone.utc
            ).isoformat(),
        }

        table.put_item(
            Item=request_item,
            ConditionExpression=(
                "attribute_not_exists(requestId)"
            ),
        )

        logger.info(
            "Created product request %s",
            request_item["requestId"],
        )

        return api_response(
            201,
            {
                "message": (
                    "Product request created successfully"
                ),
                "request": request_item,
            }
        )

    except ValueError as error:
        return api_response(
            400,
            {"message": str(error)}
        )

    except ClientError:
        logger.exception(
            "DynamoDB error while creating product request"
        )

        return api_response(
            500,
            {
                "message": (
                    "Unable to create product request"
                )
            }
        )

    except Exception:
        logger.exception(
            "Unexpected error while creating product request"
        )

        return api_response(
            500,
            {"message": "Internal server error"}
        )
