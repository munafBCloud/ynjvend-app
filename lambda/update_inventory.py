import json
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["INVENTORY_TABLE_NAME"])


def decimal_default(value):
    if isinstance(value, Decimal):
        return float(value)

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


def get_company_id(event):
    try:
        claims = (
            event["requestContext"]
            ["authorizer"]
            ["jwt"]
            ["claims"]
        )

        return claims.get("custom:companyId", "").strip()

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


def lambda_handler(event, context):
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

        product_id = str(body.get("productId", "")).strip()

        if not product_id:
            return response(
                400,
                {
                    "message": "productId is required."
                },
            )

        update_fields = {}

        if "productName" in body:
            product_name = str(body["productName"]).strip()

            if not product_name:
                return response(
                    400,
                    {
                        "message": "productName cannot be empty."
                    },
                )

            if len(product_name) > 150:
                return response(
                    400,
                    {
                        "message": (
                            "productName cannot exceed 150 characters."
                        )
                    },
                )

            update_fields["productName"] = product_name

        if "brand" in body:
            brand = str(body["brand"]).strip()

            if len(brand) > 100:
                return response(
                    400,
                    {
                        "message": "brand cannot exceed 100 characters."
                    },
                )

            update_fields["brand"] = brand

        try:
            if "caseCost" in body:
                update_fields["caseCost"] = parse_decimal(
                    body["caseCost"],
                    "caseCost",
                )

            if "sellingPrice" in body:
                update_fields["sellingPrice"] = parse_decimal(
                    body["sellingPrice"],
                    "sellingPrice",
                )

            if "quantityInStock" in body:
                update_fields["quantityInStock"] = (
                    parse_non_negative_integer(
                        body["quantityInStock"],
                        "quantityInStock",
                    )
                )

            if "reorderLevel" in body:
                update_fields["reorderLevel"] = (
                    parse_non_negative_integer(
                        body["reorderLevel"],
                        "reorderLevel",
                    )
                )

        except ValueError as error:
            return response(
                400,
                {
                    "message": str(error)
                },
            )

        if "status" in body:
            status = str(body["status"]).strip().lower()

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

            update_fields["status"] = status

        if not update_fields:
            return response(
                400,
                {
                    "message": "No valid fields were provided to update."
                },
            )

        update_fields["updatedAt"] = (
            datetime.now(timezone.utc).isoformat()
        )

        expression_names = {}
        expression_values = {}
        set_expressions = []

        for index, (field_name, value) in enumerate(
            update_fields.items()
        ):
            name_placeholder = f"#field{index}"
            value_placeholder = f":value{index}"

            expression_names[name_placeholder] = field_name
            expression_values[value_placeholder] = value

            set_expressions.append(
                f"{name_placeholder} = {value_placeholder}"
            )

        update_expression = "SET " + ", ".join(set_expressions)

        dynamodb_response = table.update_item(
            Key={
                "companyId": company_id,
                "productId": product_id,
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values,
            ConditionExpression=(
                "attribute_exists(companyId) "
                "AND attribute_exists(productId)"
            ),
            ReturnValues="ALL_NEW",
        )

        return response(
            200,
            {
                "message": "Inventory product updated successfully.",
                "item": dynamodb_response.get("Attributes", {}),
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
                404,
                {
                    "message": "Inventory product not found."
                },
            )

        logger.exception("DynamoDB error updating inventory product")

        return response(
            500,
            {
                "message": "Unable to update inventory product."
            },
        )

    except Exception:
        logger.exception("Unexpected error updating inventory product")

        return response(
            500,
            {
                "message": "Unable to update inventory product."
            },
        )
