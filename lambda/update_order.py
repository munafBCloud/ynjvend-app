import json
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
dynamodb_client = boto3.client("dynamodb")
serializer = TypeSerializer()

orders_table_name = os.environ["ORDERS_TABLE"]
inventory_table_name = os.environ["INVENTORY_TABLE"]

orders_table = dynamodb.Table(orders_table_name)
inventory_table = dynamodb.Table(inventory_table_name)

ALLOWED_FIELDS = {"status"}

VALID_TRANSITIONS = {
    "New": {"Preparing", "Cancelled"},
    "Preparing": {"Completed", "Cancelled"},
    "Completed": set(),
    "Cancelled": set(),
}


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)

            return float(obj)

        return super().default(obj)


def api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(
            body,
            cls=DecimalEncoder,
        ),
    }


def serialize_values(values):
    return {
        key: serializer.serialize(value)
        for key, value in values.items()
    }


def get_order_id(event):
    path_parameters = event.get("pathParameters") or {}
    order_id = path_parameters.get("orderId")

    if not isinstance(order_id, str) or not order_id.strip():
        raise ValueError("orderId is required")

    order_id = order_id.strip()

    if len(order_id) > 100:
        raise ValueError(
            "orderId must be no more than 100 characters"
        )

    return order_id


def parse_request_body(event):
    raw_body = event.get("body")

    if not raw_body:
        raise ValueError("Request body is required")

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise ValueError(
            "Request body must contain valid JSON"
        ) from error

    if not isinstance(body, dict):
        raise ValueError(
            "Request body must be a JSON object"
        )

    unexpected_fields = sorted(
        set(body.keys()) - ALLOWED_FIELDS
    )

    if unexpected_fields:
        raise ValueError(
            "Unexpected fields were provided: "
            + ", ".join(unexpected_fields)
        )

    if "status" not in body:
        raise ValueError("status is required")

    return body


def validate_status(value):
    if not isinstance(value, str):
        raise ValueError("status must be a string")

    status = value.strip()

    if status not in VALID_TRANSITIONS:
        raise ValueError(
            "status must be New, Preparing, "
            "Completed, or Cancelled"
        )

    return status


def normalize_order_items(existing_order):
    raw_items = existing_order.get("items")

    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError(
            "Order contains no valid inventory items"
        )

    normalized_items = {}

    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            raise ValueError(
                "Order contains an invalid inventory item"
            )

        product_id = raw_item.get("productId")
        product_name = raw_item.get("productName", product_id)
        quantity = raw_item.get("quantity")

        if (
            not isinstance(product_id, str)
            or not product_id.strip()
        ):
            raise ValueError(
                "Order contains an invalid productId"
            )

        product_id = product_id.strip()

        if isinstance(quantity, bool) or not isinstance(
            quantity,
            (int, Decimal),
        ):
            raise ValueError(
                f"Order contains an invalid quantity for "
                f"{product_id}"
            )

        quantity = Decimal(str(quantity))

        if quantity <= 0 or quantity % 1 != 0:
            raise ValueError(
                f"Order contains an invalid quantity for "
                f"{product_id}"
            )

        if product_id in normalized_items:
            normalized_items[product_id]["quantity"] += quantity
        else:
            normalized_items[product_id] = {
                "productId": product_id,
                "productName": product_name,
                "quantity": quantity,
            }

    return list(normalized_items.values())


def validate_inventory(order_items):
    for order_item in order_items:
        product_id = order_item["productId"]
        requested_quantity = order_item["quantity"]

        response = inventory_table.get_item(
            Key={
                "productId": product_id
            },
            ConsistentRead=True,
        )

        inventory_item = response.get("Item")

        if not inventory_item:
            return api_response(
                409,
                {
                    "message": "Inventory product not found",
                    "productId": product_id,
                    "product": order_item["productName"],
                },
            )

        available_quantity = inventory_item.get(
            "quantityInStock"
        )

        if not isinstance(available_quantity, Decimal):
            logger.error(
                "Inventory item %s has invalid quantityInStock",
                product_id,
            )

            return api_response(
                500,
                {
                    "message": "Inventory data is invalid"
                },
            )

        if available_quantity < requested_quantity:
            return api_response(
                409,
                {
                    "message": "Insufficient inventory",
                    "productId": product_id,
                    "product": inventory_item.get(
                        "productName",
                        order_item["productName"],
                    ),
                    "available": available_quantity,
                    "requested": requested_quantity,
                },
            )

    return None


def complete_order_transaction(
    order_id,
    existing_order,
    updated_at,
):
    order_items = normalize_order_items(existing_order)

    inventory_error = validate_inventory(order_items)

    if inventory_error:
        return inventory_error

    transaction_items = []

    for order_item in order_items:
        product_id = order_item["productId"]
        requested_quantity = order_item["quantity"]

        transaction_items.append(
            {
                "Update": {
                    "TableName": inventory_table_name,
                    "Key": {
                        "productId": serializer.serialize(
                            product_id
                        )
                    },
                    "UpdateExpression": (
                        "SET quantityInStock = "
                        "quantityInStock - :quantity"
                    ),
                    "ConditionExpression": (
                        "attribute_exists(productId) "
                        "AND attribute_exists(quantityInStock) "
                        "AND quantityInStock >= :quantity"
                    ),
                    "ExpressionAttributeValues": (
                        serialize_values(
                            {
                                ":quantity": requested_quantity
                            }
                        )
                    ),
                }
            }
        )

    transaction_items.append(
        {
            "Update": {
                "TableName": orders_table_name,
                "Key": {
                    "orderId": serializer.serialize(
                        order_id
                    )
                },
                "UpdateExpression": (
                    "SET #status = :completed, "
                    "updatedAt = :updatedAt"
                ),
                "ConditionExpression": (
                    "attribute_exists(orderId) "
                    "AND #status = :preparing"
                ),
                "ExpressionAttributeNames": {
                    "#status": "status"
                },
                "ExpressionAttributeValues": (
                    serialize_values(
                        {
                            ":completed": "Completed",
                            ":preparing": "Preparing",
                            ":updatedAt": updated_at,
                        }
                    )
                ),
            }
        }
    )

    dynamodb_client.transact_write_items(
        TransactItems=transaction_items
    )

    updated_response = orders_table.get_item(
        Key={
            "orderId": order_id
        },
        ConsistentRead=True,
    )

    updated_order = updated_response.get("Item")

    logger.info(
        "Completed order %s and deducted %s inventory products",
        order_id,
        len(order_items),
    )

    return api_response(
        200,
        {
            "message": (
                "Order completed and inventory updated "
                "successfully"
            ),
            "order": updated_order,
        },
    )


def update_status_without_inventory(
    order_id,
    current_status,
    requested_status,
    updated_at,
):
    update_response = orders_table.update_item(
        Key={
            "orderId": order_id
        },
        UpdateExpression=(
            "SET #status = :status, "
            "updatedAt = :updatedAt"
        ),
        ConditionExpression=(
            "attribute_exists(orderId) "
            "AND #status = :currentStatus"
        ),
        ExpressionAttributeNames={
            "#status": "status"
        },
        ExpressionAttributeValues={
            ":status": requested_status,
            ":updatedAt": updated_at,
            ":currentStatus": current_status,
        },
        ReturnValues="ALL_NEW",
    )

    updated_order = update_response["Attributes"]

    logger.info(
        "Updated order %s from %s to %s",
        order_id,
        current_status,
        requested_status,
    )

    return api_response(
        200,
        {
            "message": (
                "Order status updated successfully"
            ),
            "order": updated_order,
        },
    )


def lambda_handler(event, context):
    try:
        order_id = get_order_id(event)
        body = parse_request_body(event)
        requested_status = validate_status(body["status"])

        response = orders_table.get_item(
            Key={
                "orderId": order_id
            },
            ConsistentRead=True,
        )

        existing_order = response.get("Item")

        if not existing_order:
            return api_response(
                404,
                {
                    "message": "Order not found"
                },
            )

        current_status = existing_order.get("status")

        if current_status not in VALID_TRANSITIONS:
            logger.error(
                "Order %s has invalid stored status %s",
                order_id,
                current_status,
            )

            return api_response(
                500,
                {
                    "message": "Order data is invalid"
                },
            )

        if requested_status == current_status:
            return api_response(
                200,
                {
                    "message": "Order status is unchanged",
                    "order": existing_order,
                },
            )

        allowed_next_statuses = VALID_TRANSITIONS[
            current_status
        ]

        if requested_status not in allowed_next_statuses:
            return api_response(
                409,
                {
                    "message": (
                        f"Order cannot move from "
                        f"{current_status} to "
                        f"{requested_status}"
                    )
                },
            )

        updated_at = datetime.now(
            timezone.utc
        ).isoformat()

        if (
            current_status == "Preparing"
            and requested_status == "Completed"
        ):
            return complete_order_transaction(
                order_id,
                existing_order,
                updated_at,
            )

        return update_status_without_inventory(
            order_id,
            current_status,
            requested_status,
            updated_at,
        )

    except ValueError as error:
        return api_response(
            400,
            {
                "message": str(error)
            },
        )

    except ClientError as error:
        error_code = error.response.get(
            "Error",
            {},
        ).get("Code")

        if error_code == "ConditionalCheckFailedException":
            return api_response(
                409,
                {
                    "message": (
                        "Order changed before this update "
                        "could be completed. Refresh and retry."
                    )
                },
            )

        if error_code == "TransactionCanceledException":
            logger.warning(
                "Order completion transaction was cancelled",
                exc_info=True,
            )

            return api_response(
                409,
                {
                    "message": (
                        "Inventory or order data changed before "
                        "completion. Refresh and retry."
                    )
                },
            )

        logger.exception(
            "DynamoDB error while updating order"
        )

        return api_response(
            500,
            {
                "message": "Unable to update order"
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error while updating order"
        )

        return api_response(
            500,
            {
                "message": "Internal server error"
            },
        )
