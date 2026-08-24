import json
import logging
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
dynamodb_client = boto3.client("dynamodb")

inventory_table = dynamodb.Table(
    os.environ["INVENTORY_TABLE_NAME"]
)

barcode_table = dynamodb.Table(
    os.environ["BARCODE_REGISTRY_TABLE"]
)

receipts_table = dynamodb.Table(
    os.environ["INVENTORY_RECEIPTS_TABLE"]
)

serializer = TypeSerializer()

ALLOWED_FIELDS = {
    "barcode",
    "quantityReceived",
}


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
    received_by = claims.get("sub", "")

    if not isinstance(company_id, str):
        company_id = ""

    if not isinstance(received_by, str):
        received_by = ""

    return (
        company_id.strip(),
        received_by.strip(),
    )


def parse_positive_integer(value, field_name):
    if isinstance(value, bool):
        raise ValueError(
            f"{field_name} must be a whole number greater than zero"
        )

    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValueError(
            f"{field_name} must be a whole number greater than zero"
        )

    if str(value).strip() != str(number):
        raise ValueError(
            f"{field_name} must be a whole number greater than zero"
        )

    if number <= 0:
        raise ValueError(
            f"{field_name} must be greater than zero"
        )

    if number > 1_000_000:
        raise ValueError(
            f"{field_name} cannot exceed 1000000"
        )

    return number


def lambda_handler(event, context):
    try:
        company_id, received_by = get_identity(event)

        if not company_id:
            return response(
                403,
                {
                    "message": "Company access could not be verified."
                },
            )

        if not received_by:
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

        barcode = str(
            body.get("barcode", "")
        ).strip()

        if not barcode:
            return response(
                400,
                {
                    "message": "barcode is required."
                },
            )

        if len(barcode) > 80:
            return response(
                400,
                {
                    "message": "barcode cannot exceed 80 characters."
                },
            )

        try:
            quantity_received = parse_positive_integer(
                body.get("quantityReceived"),
                "quantityReceived",
            )

        except ValueError as error:
            return response(
                400,
                {
                    "message": str(error)
                },
            )

        registry_response = barcode_table.get_item(
            Key={
                "companyId": company_id,
                "barcode": barcode,
            },
            ConsistentRead=True,
        )

        registry_item = registry_response.get("Item")

        if not registry_item:
            return response(
                404,
                {
                    "message": "Inventory product not found for barcode."
                },
            )

        product_id = str(
            registry_item.get("productId", "")
        ).strip()

        if not product_id:
            logger.error(
                "Barcode registry missing productId: "
                "companyId=%s barcode=%s",
                company_id,
                barcode,
            )

            return response(
                500,
                {
                    "message": "Barcode registry is inconsistent."
                },
            )

        inventory_response = inventory_table.get_item(
            Key={
                "companyId": company_id,
                "productId": product_id,
            },
            ConsistentRead=True,
        )

        inventory_item = inventory_response.get("Item")

        if not inventory_item:
            logger.error(
                "Barcode references missing inventory product: "
                "companyId=%s barcode=%s productId=%s",
                company_id,
                barcode,
                product_id,
            )

            return response(
                500,
                {
                    "message": "Barcode registry is inconsistent."
                },
            )

        current_quantity = inventory_item.get(
            "quantityInStock"
        )

        if isinstance(current_quantity, bool):
            current_quantity = None

        try:
            current_quantity = int(current_quantity)
        except (TypeError, ValueError):
            current_quantity = None

        if current_quantity is None or current_quantity < 0:
            logger.error(
                "Invalid quantityInStock for product: "
                "companyId=%s productId=%s",
                company_id,
                product_id,
            )

            return response(
                500,
                {
                    "message": "Inventory quantity is invalid."
                },
            )

        new_quantity = (
            current_quantity + quantity_received
        )

        received_at = datetime.now(
            timezone.utc
        ).isoformat()

        receipt_id = f"rcv-{uuid.uuid4()}"

        receipt_item = {
            "companyId": company_id,
            "receiptId": receipt_id,
            "productId": product_id,
            "barcode": barcode,
            "quantityReceived": quantity_received,
            "previousQuantity": current_quantity,
            "newQuantity": new_quantity,
            "receivedAt": received_at,
            "receivedBy": received_by,
            "type": "RECEIVING",
        }

        dynamodb_client.transact_write_items(
            TransactItems=[
                {
                    "ConditionCheck": {
                        "TableName": barcode_table.name,
                        "Key": serialize_item(
                            {
                                "companyId": company_id,
                                "barcode": barcode,
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
                },
                {
                    "Update": {
                        "TableName": inventory_table.name,
                        "Key": serialize_item(
                            {
                                "companyId": company_id,
                                "productId": product_id,
                            }
                        ),
                        "UpdateExpression": (
                            "SET quantityInStock = :newQuantity, "
                            "updatedAt = :updatedAt"
                        ),
                        "ConditionExpression": (
                            "attribute_exists(companyId) "
                            "AND attribute_exists(productId) "
                            "AND quantityInStock = :previousQuantity"
                        ),
                        "ExpressionAttributeValues": (
                            serialize_values(
                                {
                                    ":newQuantity": new_quantity,
                                    ":previousQuantity": current_quantity,
                                    ":updatedAt": received_at,
                                }
                            )
                        ),
                    }
                },
                {
                    "Put": {
                        "TableName": receipts_table.name,
                        "Item": serialize_item(receipt_item),
                        "ConditionExpression": (
                            "attribute_not_exists(companyId) "
                            "AND attribute_not_exists(receiptId)"
                        ),
                    }
                },
            ]
        )

        updated_response = inventory_table.get_item(
            Key={
                "companyId": company_id,
                "productId": product_id,
            },
            ConsistentRead=True,
        )

        updated_item = updated_response.get(
            "Item",
            {},
        )

        logger.info(
            "Inventory received: companyId=%s productId=%s "
            "receiptId=%s quantityReceived=%s",
            company_id,
            product_id,
            receipt_id,
            quantity_received,
        )

        return response(
            201,
            {
                "message": "Inventory received successfully.",
                "item": updated_item,
                "receipt": receipt_item,
            },
        )

    except ClientError as error:
        error_code = (
            error.response
            .get("Error", {})
            .get("Code", "")
        )

        if error_code == "TransactionCanceledException":
            return response(
                409,
                {
                    "message": (
                        "Inventory changed while receiving. "
                        "Retry the receiving operation."
                    )
                },
            )

        logger.exception(
            "DynamoDB error receiving inventory"
        )

        return response(
            500,
            {
                "message": "Unable to receive inventory."
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error receiving inventory"
        )

        return response(
            500,
            {
                "message": "Unable to receive inventory."
            },
        )
