import json
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import boto3
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["INVENTORY_TABLE_NAME"])
barcode_table = dynamodb.Table(
    os.environ["BARCODE_REGISTRY_TABLE"]
)
dynamodb_client = boto3.client("dynamodb")
serializer = TypeSerializer()



def serialize_item(item):
    return {
        key: serializer.serialize(value)
        for key, value in item.items()
    }


def serialize_values(values):
    return {
        key: serializer.serialize(value)
        for key, value in values.items()
    }


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



def parse_barcode_fields(body):
    barcode = str(body.get("barcode", "")).strip()
    barcode_type = str(body.get("barcodeType", "")).strip().upper()

    if not barcode and not barcode_type:
        return "", ""

    if not barcode:
        raise ValueError(
            "barcode is required when barcodeType is provided"
        )

    if not barcode_type:
        raise ValueError(
            "barcodeType is required when barcode is provided"
        )

    allowed_types = {
        "UPC-A",
        "UPC-E",
        "EAN-8",
        "EAN-13",
        "CODE-128",
    }

    if barcode_type not in allowed_types:
        raise ValueError(
            "barcodeType must be UPC-A, UPC-E, EAN-8, "
            "EAN-13, or CODE-128"
        )

    numeric_lengths = {
        "UPC-A": 12,
        "UPC-E": 8,
        "EAN-8": 8,
        "EAN-13": 13,
    }

    if barcode_type in numeric_lengths:
        expected_length = numeric_lengths[barcode_type]

        if not barcode.isdigit():
            raise ValueError(
                f"{barcode_type} barcode must contain only digits"
            )

        if len(barcode) != expected_length:
            raise ValueError(
                f"{barcode_type} barcode must be "
                f"{expected_length} digits"
            )

    if barcode_type == "CODE-128":
        if len(barcode) > 80:
            raise ValueError(
                "CODE-128 barcode cannot exceed 80 characters"
            )

        if not all(32 <= ord(character) <= 126 for character in barcode):
            raise ValueError(
                "CODE-128 barcode contains unsupported characters"
            )

    return barcode, barcode_type

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

        barcode_update_requested = (
            "barcode" in body or
            "barcodeType" in body
        )

        requested_barcode = ""
        requested_barcode_type = ""

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

        if barcode_update_requested:
            try:
                (
                    requested_barcode,
                    requested_barcode_type,
                ) = parse_barcode_fields(body)

            except ValueError as error:
                return response(
                    400,
                    {
                        "message": str(error)
                    },
                )

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

        if not update_fields and not barcode_update_requested:
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

        if barcode_update_requested:
            current_response = table.get_item(
                Key={
                    "companyId": company_id,
                    "productId": product_id,
                },
                ConsistentRead=True,
            )

            current_item = current_response.get("Item")

            if not current_item:
                return response(
                    404,
                    {
                        "message": "Inventory product not found."
                    },
                )

            current_barcode = str(
                current_item.get("barcode", "")
            ).strip()

            transaction_names = dict(expression_names)
            transaction_values = dict(expression_values)

            transaction_names["#barcode"] = "barcode"
            transaction_names["#barcodeType"] = "barcodeType"

            if requested_barcode:
                transaction_values[":barcode"] = requested_barcode
                transaction_values[":barcodeType"] = (
                    requested_barcode_type
                )

                update_expression += (
                    ", #barcode = :barcode, "
                    "#barcodeType = :barcodeType"
                )

            else:
                update_expression += (
                    " REMOVE #barcode, #barcodeType"
                )

            transact_items = [
                {
                    "Update": {
                        "TableName": table.name,
                        "Key": serialize_item(
                            {
                                "companyId": company_id,
                                "productId": product_id,
                            }
                        ),
                        "UpdateExpression": update_expression,
                        "ExpressionAttributeNames": transaction_names,
                        "ExpressionAttributeValues": serialize_values(
                            transaction_values
                        ),
                        "ConditionExpression": (
                            "attribute_exists(companyId) "
                            "AND attribute_exists(productId)"
                        ),
                    }
                }
            ]

            if (
                current_barcode and
                current_barcode != requested_barcode
            ):
                transact_items.append(
                    {
                        "Delete": {
                            "TableName": barcode_table.name,
                            "Key": serialize_item(
                                {
                                    "companyId": company_id,
                                    "barcode": current_barcode,
                                }
                            ),
                            "ConditionExpression": (
                                "#productId = :productId"
                            ),
                            "ExpressionAttributeNames": {
                                "#productId": "productId"
                            },
                            "ExpressionAttributeValues": (
                                serialize_values(
                                    {
                                        ":productId": product_id
                                    }
                                )
                            ),
                        }
                    }
                )

            if requested_barcode:
                barcode_item = {
                    "companyId": company_id,
                    "barcode": requested_barcode,
                    "productId": product_id,
                    "barcodeType": requested_barcode_type,
                    "updatedAt": update_fields["updatedAt"],
                }

                transact_items.append(
                    {
                        "Put": {
                            "TableName": barcode_table.name,
                            "Item": serialize_item(barcode_item),
                            "ConditionExpression": (
                                "attribute_not_exists(companyId) "
                                "OR #productId = :productId"
                            ),
                            "ExpressionAttributeNames": {
                                "#productId": "productId"
                            },
                            "ExpressionAttributeValues": (
                                serialize_values(
                                    {
                                        ":productId": product_id
                                    }
                                )
                            ),
                        }
                    }
                )

            dynamodb_client.transact_write_items(
                TransactItems=transact_items
            )

            updated_response = table.get_item(
                Key={
                    "companyId": company_id,
                    "productId": product_id,
                },
                ConsistentRead=True,
            )

            updated_item = updated_response.get("Item", {})

        else:
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

            updated_item = dynamodb_response.get(
                "Attributes",
                {},
            )

        return response(
            200,
            {
                "message": "Inventory product updated successfully.",
                "item": updated_item,
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

        if error_code == "TransactionCanceledException":
            return response(
                409,
                {
                    "message": (
                        "The barcode update could not be completed. "
                        "The barcode may already belong to another "
                        "product or the barcode registry may be "
                        "inconsistent."
                    )
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
