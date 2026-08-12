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


def decimal_serializer(value):
    if isinstance(value, Decimal):
        if value % 1 == 0:
            return int(value)
        return float(value)

    raise TypeError(
        f"Object of type {value.__class__.__name__} "
        "is not JSON serializable"
    )


def api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(
            body,
            default=decimal_serializer,
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


def get_company_id(event):
    claims = get_jwt_claims(event)

    company_id = claims.get("custom:companyId")

    if not isinstance(company_id, str):
        return None

    company_id = company_id.strip()

    if not company_id:
        return None

    return company_id


def validate_required_text(
    value,
    field_name,
    maximum_length,
):
    if not isinstance(value, str):
        raise ValueError(
            f"{field_name} must be a string"
        )

    value = value.strip()

    if not value:
        raise ValueError(
            f"{field_name} is required"
        )

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
        raise ValueError(
            "notes must be a string"
        )

    value = value.strip()

    if len(value) > MAX_NOTES_LENGTH:
        raise ValueError(
            f"notes must be no more than "
            f"{MAX_NOTES_LENGTH} characters"
        )

    return value


def validate_quantity(value):
    if isinstance(value, bool):
        raise ValueError(
            "quantity must be a whole number"
        )

    try:
        quantity = Decimal(str(value))
    except (
        InvalidOperation,
        ValueError,
        TypeError,
    ):
        raise ValueError(
            "quantity must be a whole number"
        )

    if quantity != quantity.to_integral_value():
        raise ValueError(
            "quantity must be a whole number"
        )

    quantity = int(quantity)

    if quantity < 1 or quantity > MAX_QUANTITY:
        raise ValueError(
            f"quantity must be between "
            f"1 and {MAX_QUANTITY}"
        )

    return quantity


def validate_money(value, field_name):
    if isinstance(value, bool):
        raise ValueError(
            f"{field_name} must be a valid number"
        )

    try:
        amount = Decimal(str(value))
    except (
        InvalidOperation,
        ValueError,
        TypeError,
    ):
        raise ValueError(
            f"{field_name} must be a valid number"
        )

    if not amount.is_finite():
        raise ValueError(
            f"{field_name} must be a valid number"
        )

    if amount < 0:
        raise ValueError(
            f"{field_name} cannot be negative"
        )

    return amount.quantize(
        Decimal("0.01")
    )


def get_customer(company_id, customer_id):
    response = customers_table.get_item(
        Key={
            "companyId": company_id,
            "customerId": customer_id,
        }
    )

    return response.get("Item")


def get_inventory_product(
    company_id,
    product_id,
):
    response = inventory_table.get_item(
        Key={
            "companyId": company_id,
            "productId": product_id,
        }
    )

    return response.get("Item")


def validate_order_items(company_id, items):
    if not isinstance(items, list):
        raise ValueError(
            "items must be an array"
        )

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
                f"Order item {item_number} "
                "must be an object"
            )

        unexpected_fields = sorted(
            set(item.keys())
            - {"productId", "quantity"}
        )

        if unexpected_fields:
            raise ValueError(
                f"Order item {item_number} contains "
                f"unexpected fields: "
                f"{', '.join(unexpected_fields)}"
            )

        if "productId" not in item:
            raise ValueError(
                f"Order item {item_number} "
                "is missing productId"
            )

        if "quantity" not in item:
            raise ValueError(
                f"Order item {item_number} "
                "is missing quantity"
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

        quantity = validate_quantity(
            item["quantity"]
        )

        product = get_inventory_product(
            company_id,
            product_id,
        )

        if not product:
            raise LookupError(
                "Inventory product not found: "
                f"{product_id}"
            )

        product_name = product.get(
            "productName"
        )

        if (
            not isinstance(product_name, str)
            or not product_name.strip()
        ):
            logger.error(
                "Inventory product %s for "
                "company %s has no valid "
                "productName",
                product_id,
                company_id,
            )

            raise RuntimeError(
                "Inventory product data "
                "is incomplete"
            )

        if "sellingPrice" not in product:
            logger.error(
                "Inventory product %s for "
                "company %s has no sellingPrice",
                product_id,
                company_id,
            )

            raise RuntimeError(
                "Inventory product pricing "
                "is incomplete"
            )

        try:
            unit_price = validate_money(
                product["sellingPrice"],
                "sellingPrice",
            )
        except ValueError as error:
            logger.error(
                "Inventory product %s for "
                "company %s has invalid "
                "sellingPrice",
                product_id,
                company_id,
            )

            raise RuntimeError(
                "Inventory product pricing "
                "is invalid"
            ) from error

        line_total = (
            unit_price * Decimal(quantity)
        ).quantize(
            Decimal("0.01")
        )

        product_ids.add(product_id)

        validated_items.append(
            {
                "productId": product_id,
                "productName": (
                    product_name.strip()
                ),
                "quantity": quantity,
                "unitPrice": unit_price,
                "lineTotal": line_total,
            }
        )

    return validated_items


def calculate_subtotal(items):
    return sum(
        (
            item["lineTotal"]
            for item in items
        ),
        Decimal("0.00"),
    ).quantize(
        Decimal("0.01")
    )


def lambda_handler(event, context):
    try:
        company_id = get_company_id(event)

        if not company_id:
            logger.warning(
                "Request rejected because "
                "custom:companyId was missing "
                "from the JWT claims"
            )

            return api_response(
                403,
                {
                    "message": (
                        "Authenticated user is not "
                        "assigned to a company"
                    )
                },
            )

        raw_body = event.get("body")

        if not raw_body:
            return api_response(
                400,
                {
                    "message": (
                        "Request body is required"
                    )
                },
            )

        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            return api_response(
                400,
                {
                    "message": (
                        "Request body must contain "
                        "valid JSON"
                    )
                },
            )

        if not isinstance(body, dict):
            return api_response(
                400,
                {
                    "message": (
                        "Request body must be "
                        "a JSON object"
                    )
                },
            )

        unexpected_fields = sorted(
            set(body.keys()) - ALLOWED_FIELDS
        )

        if unexpected_fields:
            return api_response(
                400,
                {
                    "message": (
                        "Unexpected fields "
                        "were provided"
                    ),
                    "fields": unexpected_fields,
                },
            )

        missing_fields = []

        if "customerId" not in body:
            missing_fields.append(
                "customerId"
            )

        if "items" not in body:
            missing_fields.append(
                "items"
            )

        if missing_fields:
            return api_response(
                400,
                {
                    "message": (
                        "Missing required fields"
                    ),
                    "fields": missing_fields,
                },
            )

        customer_id = validate_required_text(
            body["customerId"],
            "customerId",
            100,
        )

        notes = validate_notes(
            body.get("notes")
        )

        customer = get_customer(
            company_id,
            customer_id,
        )

        if not customer:
            return api_response(
                404,
                {
                    "message": (
                        "The selected customer "
                        "does not exist"
                    )
                },
            )

        business_name = customer.get(
            "businessName"
        )

        if (
            not isinstance(
                business_name,
                str,
            )
            or not business_name.strip()
        ):
            logger.error(
                "Customer %s for company %s "
                "has no valid businessName",
                customer_id,
                company_id,
            )

            return api_response(
                500,
                {
                    "message": (
                        "Customer data "
                        "is incomplete"
                    )
                },
            )

        try:
            validated_items = (
                validate_order_items(
                    company_id,
                    body["items"],
                )
            )
        except LookupError as error:
            return api_response(
                404,
                {
                    "message": str(error)
                },
            )

        subtotal = calculate_subtotal(
            validated_items
        )

        tax = Decimal("0.00")
        discount = Decimal("0.00")

        total = (
            subtotal
            + tax
            - discount
        ).quantize(
            Decimal("0.01")
        )

        timestamp = datetime.now(
            timezone.utc
        ).isoformat()

        order_id = str(uuid.uuid4())

        order = {
            "companyId": company_id,
            "orderId": order_id,
            "customerId": customer_id,
            "businessName": (
                business_name.strip()
            ),
            "status": "New",
            "items": validated_items,
            "notes": notes,
            "subtotal": subtotal,
            "tax": tax,
            "discount": discount,
            "total": total,
            "paymentStatus": "Unpaid",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }

        orders_table.put_item(
            Item=order,
            ConditionExpression=(
                "attribute_not_exists("
                "companyId) AND "
                "attribute_not_exists("
                "orderId)"
            ),
        )

        logger.info(
            "Created order %s for customer "
            "%s in company %s with %s items "
            "and total %s",
            order_id,
            customer_id,
            company_id,
            len(validated_items),
            total,
        )

        return api_response(
            201,
            {
                "message": (
                    "Order created successfully"
                ),
                "order": order,
            },
        )

    except ValueError as error:
        return api_response(
            400,
            {
                "message": str(error)
            },
        )

    except ClientError:
        logger.exception(
            "DynamoDB error while "
            "creating order"
        )

        return api_response(
            500,
            {
                "message": (
                    "Unable to create order"
                )
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error while "
            "creating order"
        )

        return api_response(
            500,
            {
                "message": (
                    "Internal server error"
                )
            },
        )
