import json
import logging
import os
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")

invoices_table = dynamodb.Table(
    os.environ["INVOICES_TABLE"]
)

orders_table = dynamodb.Table(
    os.environ["ORDERS_TABLE"]
)

ALLOWED_FIELDS = {
    "orderId",
    "issueDate",
    "dueDate",
    "notes",
}

MAX_NOTES_LENGTH = 2000
MAX_ORDER_ITEMS = 100


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)

        return super().default(obj)


def api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(
            body,
            cls=DecimalEncoder,
        ),
    }


def get_company_id(event):
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    company_id = claims.get(
        "custom:companyId"
    )

    if (
        not isinstance(company_id, str)
        or not company_id.strip()
    ):
        raise PermissionError(
            "Authenticated user is missing company access."
        )

    return company_id.strip()


def parse_body(event):
    raw_body = event.get("body")

    if not raw_body:
        raise ValueError(
            "Request body is required."
        )

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise ValueError(
            "Request body must contain valid JSON."
        ) from error

    if not isinstance(body, dict):
        raise ValueError(
            "Request body must be a JSON object."
        )

    unexpected_fields = sorted(
        set(body.keys()) - ALLOWED_FIELDS
    )

    if unexpected_fields:
        raise ValueError(
            "Unexpected fields were provided: "
            + ", ".join(unexpected_fields)
        )

    return body


def require_string(
    body,
    field_name,
    max_length,
):
    value = body.get(field_name)

    if (
        not isinstance(value, str)
        or not value.strip()
    ):
        raise ValueError(
            f"{field_name} is required."
        )

    value = value.strip()

    if len(value) > max_length:
        raise ValueError(
            f"{field_name} must be no more than "
            f"{max_length} characters."
        )

    return value


def optional_string(
    body,
    field_name,
    max_length,
):
    value = body.get(field_name, "")

    if value is None:
        return ""

    if not isinstance(value, str):
        raise ValueError(
            f"{field_name} must be a string."
        )

    value = value.strip()

    if len(value) > max_length:
        raise ValueError(
            f"{field_name} must be no more than "
            f"{max_length} characters."
        )

    return value


def validate_date(value, field_name):
    try:
        parsed_date = date.fromisoformat(
            value
        )
    except ValueError as error:
        raise ValueError(
            f"{field_name} must use YYYY-MM-DD format."
        ) from error

    return parsed_date


def validate_money(value, field_name):
    if isinstance(value, bool):
        raise ValueError(
            f"{field_name} must be a valid number."
        )

    try:
        amount = Decimal(str(value))
    except (
        InvalidOperation,
        ValueError,
        TypeError,
    ) as error:
        raise ValueError(
            f"{field_name} must be a valid number."
        ) from error

    if not amount.is_finite():
        raise ValueError(
            f"{field_name} must be a valid number."
        )

    if amount < 0:
        raise ValueError(
            f"{field_name} cannot be negative."
        )

    return amount.quantize(
        Decimal("0.01")
    )


def get_order(company_id, order_id):
    response = orders_table.get_item(
        Key={
            "companyId": company_id,
            "orderId": order_id,
        },
        ConsistentRead=True,
    )

    return response.get("Item")


def validate_order_items(order):
    raw_items = order.get("items")

    if (
        not isinstance(raw_items, list)
        or not raw_items
    ):
        raise RuntimeError(
            "Order contains no valid items."
        )

    if len(raw_items) > MAX_ORDER_ITEMS:
        raise RuntimeError(
            "Order contains too many items."
        )

    validated_items = []

    for index, raw_item in enumerate(
        raw_items
    ):
        if not isinstance(raw_item, dict):
            raise RuntimeError(
                f"Order item {index + 1} is invalid."
            )

        product_id = raw_item.get(
            "productId"
        )

        product_name = raw_item.get(
            "productName"
        )

        quantity = raw_item.get(
            "quantity"
        )

        unit_price = raw_item.get(
            "unitPrice"
        )

        line_total = raw_item.get(
            "lineTotal"
        )

        if (
            not isinstance(product_id, str)
            or not product_id.strip()
        ):
            raise RuntimeError(
                "Order contains an invalid productId."
            )

        if (
            not isinstance(product_name, str)
            or not product_name.strip()
        ):
            raise RuntimeError(
                "Order contains an invalid productName."
            )

        if isinstance(quantity, bool):
            raise RuntimeError(
                "Order contains an invalid quantity."
            )

        try:
            quantity = Decimal(
                str(quantity)
            )
        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ) as error:
            raise RuntimeError(
                "Order contains an invalid quantity."
            ) from error

        if (
            quantity <= 0
            or quantity % 1 != 0
        ):
            raise RuntimeError(
                "Order contains an invalid quantity."
            )

        try:
            unit_price = validate_money(
                unit_price,
                "unitPrice",
            )

            line_total = validate_money(
                line_total,
                "lineTotal",
            )
        except ValueError as error:
            raise RuntimeError(
                "Order contains invalid pricing."
            ) from error

        expected_line_total = (
            quantity * unit_price
        ).quantize(
            Decimal("0.01")
        )

        if line_total != expected_line_total:
            raise RuntimeError(
                "Order item pricing is inconsistent."
            )

        validated_items.append(
            {
                "productId": (
                    product_id.strip()
                ),
                "productName": (
                    product_name.strip()
                ),
                "quantity": quantity,
                "unitPrice": unit_price,
                "lineTotal": line_total,
            }
        )

    return validated_items


def validate_order_financials(
    order,
    items,
):
    try:
        subtotal = validate_money(
            order.get("subtotal"),
            "subtotal",
        )

        tax = validate_money(
            order.get("tax"),
            "tax",
        )

        discount = validate_money(
            order.get("discount"),
            "discount",
        )

        total = validate_money(
            order.get("total"),
            "total",
        )
    except ValueError as error:
        raise RuntimeError(
            "Order contains invalid financial data."
        ) from error

    calculated_subtotal = sum(
        (
            item["lineTotal"]
            for item in items
        ),
        Decimal("0.00"),
    ).quantize(
        Decimal("0.01")
    )

    if subtotal != calculated_subtotal:
        raise RuntimeError(
            "Order subtotal is inconsistent."
        )

    calculated_total = (
        subtotal
        + tax
        - discount
    ).quantize(
        Decimal("0.01")
    )

    if total != calculated_total:
        raise RuntimeError(
            "Order total is inconsistent."
        )

    return (
        subtotal,
        tax,
        discount,
        total,
    )


def lambda_handler(event, context):
    try:
        company_id = get_company_id(
            event
        )

        body = parse_body(
            event
        )

        order_id = require_string(
            body,
            "orderId",
            100,
        )

        issue_date = require_string(
            body,
            "issueDate",
            30,
        )

        due_date = require_string(
            body,
            "dueDate",
            30,
        )

        notes = optional_string(
            body,
            "notes",
            MAX_NOTES_LENGTH,
        )

        parsed_issue_date = validate_date(
            issue_date,
            "issueDate",
        )

        parsed_due_date = validate_date(
            due_date,
            "dueDate",
        )

        if parsed_due_date < parsed_issue_date:
            raise ValueError(
                "dueDate cannot be before issueDate."
            )

        order = get_order(
            company_id,
            order_id,
        )

        if not order:
            return api_response(
                404,
                {
                    "message": (
                        "Order not found."
                    )
                },
            )

        order_status = order.get(
            "status"
        )

        if order_status != "Completed":
            return api_response(
                409,
                {
                    "message": (
                        "Only completed orders "
                        "can be invoiced."
                    )
                },
            )

        customer_id = order.get(
            "customerId"
        )

        business_name = order.get(
            "businessName"
        )

        if (
            not isinstance(customer_id, str)
            or not customer_id.strip()
        ):
            logger.error(
                "Order %s has invalid customerId",
                order_id,
            )

            return api_response(
                500,
                {
                    "message": (
                        "Order customer data "
                        "is incomplete."
                    )
                },
            )

        if (
            not isinstance(business_name, str)
            or not business_name.strip()
        ):
            logger.error(
                "Order %s has invalid businessName",
                order_id,
            )

            return api_response(
                500,
                {
                    "message": (
                        "Order customer data "
                        "is incomplete."
                    )
                },
            )

        items = validate_order_items(
            order
        )

        (
            subtotal,
            tax,
            discount,
            total,
        ) = validate_order_financials(
            order,
            items,
        )

        now = datetime.now(
            timezone.utc
        ).isoformat()

        invoice_id = (
            f"ORDER-{order_id}"
        )

        invoice_number_id = str(
            uuid.uuid4()
        )

        invoice_number = (
            f"INV-{now[:4]}-"
            f"{invoice_number_id[:8].upper()}"
        )

        amount_paid = Decimal(
            "0.00"
        )

        balance_due = total

        invoice = {
            "companyId": company_id,
            "invoiceId": invoice_id,
            "invoiceNumber": invoice_number,
            "orderId": order_id,
            "customerId": (
                customer_id.strip()
            ),
            "businessName": (
                business_name.strip()
            ),
            "status": "Draft",
            "issueDate": issue_date,
            "dueDate": due_date,
            "subtotal": subtotal,
            "tax": tax,
            "discount": discount,
            "total": total,
            "amountPaid": amount_paid,
            "balanceDue": balance_due,
            "notes": notes,
            "items": items,
            "createdAt": now,
            "updatedAt": now,
        }

        invoices_table.put_item(
            Item=invoice,
            ConditionExpression=(
                "attribute_not_exists("
                "companyId) AND "
                "attribute_not_exists("
                "invoiceId)"
            ),
        )

        logger.info(
            "Created invoice %s from order %s "
            "for company %s with total %s",
            invoice_id,
            order_id,
            company_id,
            total,
        )

        return api_response(
            201,
            {
                "message": (
                    "Invoice created successfully."
                ),
                "invoice": invoice,
            },
        )

    except PermissionError as error:
        return api_response(
            403,
            {
                "message": str(error)
            },
        )

    except ValueError as error:
        return api_response(
            400,
            {
                "message": str(error)
            },
        )

    except RuntimeError:
        logger.exception(
            "Invalid order data while "
            "creating invoice."
        )

        return api_response(
            500,
            {
                "message": (
                    "Unable to create invoice "
                    "from order data."
                )
            },
        )

    except ClientError as error:
        error_code = (
            error.response
            .get("Error", {})
            .get("Code", "")
        )

        if error_code == "ConditionalCheckFailedException":
            return api_response(
                409,
                {
                    "message": (
                        "An invoice already exists "
                        "for this order."
                    )
                },
            )

        logger.exception(
            "DynamoDB error while "
            "creating invoice."
        )

        return api_response(
            500,
            {
                "message": (
                    "Unable to create invoice."
                )
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error while "
            "creating invoice."
        )

        return api_response(
            500,
            {
                "message": (
                    "Internal server error."
                )
            },
        )
