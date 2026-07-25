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

orders_table = dynamodb.Table(os.environ["ORDERS_TABLE"])
customers_table = dynamodb.Table(os.environ["CUSTOMERS_TABLE"])
inventory_table = dynamodb.Table(os.environ["INVENTORY_TABLE"])

ALLOWED_FIELDS = {
    "customerId",
    "items",
    "notes",
}

MAX_ORDER_ITEMS = 100
MAX_NOTES_LENGTH = 500
MAX_QUANTITY = 1000


def api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }


def validate_required_text(value, field_name, maximum_length):
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")

    value = value.strip()

    if not value:
        raise ValueError(f"{field_name} is required")

    if len(value) > maximum_length:
        raise ValueError(
            f"{field_name} must be no more than "
            f"{maximum_length} characters"
        )

    return value


def validate_notes(value):
    if value is None:
        return ""

    if not isinstance(value, str):
        raise ValueError("notes must be a string")

    value = value.strip()

    if len(value) > MAX_NOTES_LENGTH:
        raise ValueError(
            f"notes must be no more than "
            f"{MAX_NOTES_LENGTH} characters"
        )

    return value


def validate_quantity(value):
    if isinstance(value, bool):
        raise ValueError("quantity must be a whole number")

    try:
        quantity = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError("quantity must be a whole number")

    if quantity != quantity.to_integral_value():
        raise ValueError("quantity must be a whole number")

    quantity = int(quantity)

    if quantity < 1 or quantity > MAX_QUANTITY:
        raise ValueError(
            f"quantity must be between 1 and {MAX_QUANTITY}"
        )

    return quantity


def get_customer(customer_id):
    response = customers_table.get_item(
        Key={
            "customerId": customer_id
        }
    )

    return response.get("Item")


def get_inventory_product(product_id):
    response = inventory_table.get_item(
        Key={
            "productId": product_id
        }
    )

    return response.get("Item")


def validate_order_items(items):
    if not isinstance(items, list):
        raise ValueError("items must be an array")

    if not items:
        raise ValueError(
            "At least one order item is required"
        )

    if len(items) > MAX_ORDER_ITEMS:
        raise ValueError(
            f"An order cannot contain more than "
            f"{MAX_ORDER_ITEMS} items"
        )

    validated_items = []
    product_ids = set()

    for index, item in enumerate(items):
        item_number = index + 1

        if not isinstance(item, dict):
            raise ValueError(
                f"Order item {item_number} must be an object"
            )

        unexpected_fields = sorted(
            set(item.keys()) - {"productId", "quantity"}
        )

        if unexpected_fields:
            raise ValueError(
                f"Order item {item_number} contains "
                f"unexpected fields: "
                f"{', '.join(unexpected_fields)}"
            )

        if "productId" not in item:
            raise ValueError(
                f"Order item {item_number} is missing productId"
            )

        if "quantity" not in item:
            raise ValueError(
                f"Order item {item_number} is missing quantity"
            )

        product_id = validate_required_text(
            item["productId"],
            f"items[{index}].productId",
            100,
        )

        if product_id in product_ids:
            raise ValueError(
                f"Duplicate productId: {product_id}"
            )

        quantity = validate_quantity(item["quantity"])

        product = get_inventory_product(product_id)

        if not product:
            raise LookupError(
                f"Inventory product not found: {product_id}"
            )

        product_name = product.get("productName")

        if not isinstance(product_name, str) or not product_name.strip():
            logger.error(
                "Inventory product %s has no valid productName",
                product_id,
            )

            raise RuntimeError(
                "Inventory product data is incomplete"
            )

        product_ids.add(product_id)

        validated_items.append({
            "productId": product_id,
            "productName": product_name.strip(),
            "quantity": quantity,
        })

    return validated_items


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
                {
                    "message": (
                        "Request body must contain valid JSON"
                    )
                }
            )

        if not isinstance(body, dict):
            return api_response(
                400,
                {
                    "message": (
                        "Request body must be a JSON object"
                    )
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

        if "customerId" not in body:
            return api_response(
                400,
                {
                    "message": "Missing required fields",
                    "fields": ["customerId"],
                }
            )

        if "items" not in body:
            return api_response(
                400,
                {
                    "message": "Missing required fields",
                    "fields": ["items"],
                }
            )

        customer_id = validate_required_text(
            body["customerId"],
            "customerId",
            100,
        )

        notes = validate_notes(body.get("notes"))

        customer = get_customer(customer_id)

        if not customer:
            return api_response(
                404,
                {
                    "message": (
                        "The selected customer does not exist"
                    )
                }
            )

        business_name = customer.get("businessName")

        if (
            not isinstance(business_name, str)
            or not business_name.strip()
        ):
            logger.error(
                "Customer %s has no valid businessName",
                customer_id,
            )

            return api_response(
                500,
                {
                    "message": (
                        "Customer data is incomplete"
                    )
                }
            )

        try:
            validated_items = validate_order_items(
                body["items"]
            )
        except LookupError as error:
            return api_response(
                404,
                {"message": str(error)}
            )

        timestamp = datetime.now(timezone.utc).isoformat()

        order = {
            "orderId": str(uuid.uuid4()),
            "customerId": customer_id,
            "businessName": business_name.strip(),
            "status": "New",
            "items": validated_items,
            "notes": notes,
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }

        orders_table.put_item(
            Item=order,
            ConditionExpression=(
                "attribute_not_exists(orderId)"
            ),
        )

        logger.info(
            "Created order %s for customer %s with %s items",
            order["orderId"],
            customer_id,
            len(validated_items),
        )

        return api_response(
            201,
            {
                "message": "Order created successfully",
                "order": order,
            }
        )

    except ValueError as error:
        return api_response(
            400,
            {"message": str(error)}
        )

    except ClientError:
        logger.exception(
            "DynamoDB error while creating order"
        )

        return api_response(
            500,
            {
                "message": "Unable to create order"
            }
        )

    except Exception:
        logger.exception(
            "Unexpected error while creating order"
        )

        return api_response(
            500,
            {"message": "Internal server error"}
        )
