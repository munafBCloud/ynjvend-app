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
table = dynamodb.Table(os.environ["INVENTORY_TABLE_NAME"])

ALLOWED_FIELDS = {
    "productName",
    "brand",
    "caseCost",
    "sellingPrice",
    "quantityInStock",
    "reorderLevel",
    "status",
    "productId",
}


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=str),
    }


def get_company_id(event):
    try:
        claims = (
            event["requestContext"]
            ["authorizer"]
            ["jwt"]
            ["claims"]
        )

        company_id = claims.get("custom:companyId", "").strip()

        return company_id

    except (KeyError, TypeError, AttributeError):
        return ""


def parse_decimal(value, field_name):
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid number")

    if number < 0:
        raise ValueError(f"{field_name} cannot be negative")

    return number


def parse_non_negative_integer(value, field_name):
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a whole number")

    if number < 0:
        raise ValueError(f"{field_name} cannot be negative")

    return number


def handler(event, context):
    try:
        company_id = get_company_id(event)

        if not company_id:
            return response(
                403,
                {
                    "message": "Company access could not be verified."
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

        product_name = str(body.get("productName", "")).strip()
        brand = str(body.get("brand", "")).strip()

        if not product_name:
            return response(
                400,
                {
                    "message": "productName is required."
                },
            )

        if len(product_name) > 150:
            return response(
                400,
                {
                    "message": "productName cannot exceed 150 characters."
                },
            )

        if len(brand) > 100:
            return response(
                400,
                {
                    "message": "brand cannot exceed 100 characters."
                },
            )

        try:
            case_cost = parse_decimal(
                body.get("caseCost", 0),
                "caseCost",
            )

            selling_price = parse_decimal(
                body.get("sellingPrice", 0),
                "sellingPrice",
            )

            quantity_in_stock = parse_non_negative_integer(
                body.get("quantityInStock", 0),
                "quantityInStock",
            )

            reorder_level = parse_non_negative_integer(
                body.get("reorderLevel", 0),
                "reorderLevel",
            )

        except ValueError as error:
            return response(
                400,
                {
                    "message": str(error)
                },
            )

        status = str(body.get("status", "active")).strip().lower()

        allowed_statuses = {
            "active",
            "inactive",
            "archived",
        }

        if status not in allowed_statuses:
            return response(
                400,
                {
                    "message": (
                        "status must be active, inactive, or archived."
                    )
                },
            )

        product_id = str(
            body.get("productId") or uuid.uuid4()
        ).strip()

        if not product_id:
            return response(
                400,
                {
                    "message": "productId cannot be empty."
                },
            )

        if len(product_id) > 100:
            return response(
                400,
                {
                    "message": "productId cannot exceed 100 characters."
                },
            )

        timestamp = datetime.now(timezone.utc).isoformat()

        item = {
            "companyId": company_id,
            "productId": product_id,
            "productName": product_name,
            "brand": brand,
            "caseCost": case_cost,
            "sellingPrice": selling_price,
            "quantityInStock": quantity_in_stock,
            "reorderLevel": reorder_level,
            "status": status,
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }

        table.put_item(
            Item=item,
            ConditionExpression=(
                "attribute_not_exists(companyId) "
                "AND attribute_not_exists(productId)"
            ),
        )

        return response(
            201,
            {
                "message": "Inventory product created successfully.",
                "item": item,
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
                    "message": (
                        "An inventory product with this productId "
                        "already exists."
                    )
                },
            )

        logger.exception("DynamoDB error creating inventory product")

        return response(
            500,
            {
                "message": "Unable to create inventory product."
            },
        )

    except Exception:
        logger.exception("Unexpected error creating inventory product")

        return response(
            500,
            {
                "message": "Unable to create inventory product."
            },
        )
