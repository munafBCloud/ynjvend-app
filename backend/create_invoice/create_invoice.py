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
invoices_table = dynamodb.Table(os.environ["INVOICES_TABLE"])

ALLOWED_STATUSES = {
    "Draft",
    "Sent",
    "Partially Paid",
    "Paid",
    "Overdue",
    "Void",
}


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
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def get_company_id(event):
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    company_id = claims.get("custom:companyId")

    if not isinstance(company_id, str) or not company_id.strip():
        raise PermissionError("Authenticated user is missing company access.")

    return company_id.strip()


def parse_body(event):
    raw_body = event.get("body")

    if not raw_body:
        raise ValueError("Request body is required.")

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise ValueError("Request body must contain valid JSON.") from error

    if not isinstance(body, dict):
        raise ValueError("Request body must be a JSON object.")

    return body


def require_string(body, field_name, max_length):
    value = body.get(field_name)

    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} is required.")

    value = value.strip()

    if len(value) > max_length:
        raise ValueError(
            f"{field_name} must be no more than {max_length} characters."
        )

    return value


def optional_string(body, field_name, max_length):
    value = body.get(field_name, "")

    if value is None:
        return ""

    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string.")

    value = value.strip()

    if len(value) > max_length:
        raise ValueError(
            f"{field_name} must be no more than {max_length} characters."
        )

    return value


def parse_money(body, field_name, default="0"):
    raw_value = body.get(field_name, default)

    if isinstance(raw_value, bool):
        raise ValueError(f"{field_name} must be a valid number.")

    try:
        value = Decimal(str(raw_value))
    except (InvalidOperation, ValueError, TypeError) as error:
        raise ValueError(f"{field_name} must be a valid number.") from error

    if value < 0:
        raise ValueError(f"{field_name} cannot be negative.")

    return value.quantize(Decimal("0.01"))


def validate_items(body):
    raw_items = body.get("items")

    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError("At least one invoice item is required.")

    items = []

    for index, raw_item in enumerate(raw_items):
        if not isinstance(raw_item, dict):
            raise ValueError(f"Invoice item {index + 1} is invalid.")

        product_id = require_string(raw_item, "productId", 100)
        product_name = require_string(raw_item, "productName", 200)

        raw_quantity = raw_item.get("quantity")

        if isinstance(raw_quantity, bool):
            raise ValueError(
                f"quantity for invoice item {index + 1} must be valid."
            )

        try:
            quantity = Decimal(str(raw_quantity))
        except (InvalidOperation, ValueError, TypeError) as error:
            raise ValueError(
                f"quantity for invoice item {index + 1} must be valid."
            ) from error

        if quantity <= 0:
            raise ValueError(
                f"quantity for invoice item {index + 1} must be greater than zero."
            )

        unit_price = parse_money(raw_item, "unitPrice")
        line_total = (quantity * unit_price).quantize(Decimal("0.01"))

        items.append(
            {
                "productId": product_id,
                "productName": product_name,
                "quantity": quantity,
                "unitPrice": unit_price,
                "lineTotal": line_total,
            }
        )

    return items


def lambda_handler(event, context):
    try:
        company_id = get_company_id(event)
        body = parse_body(event)

        customer_id = require_string(body, "customerId", 100)
        business_name = require_string(body, "businessName", 200)
        issue_date = require_string(body, "issueDate", 30)
        due_date = require_string(body, "dueDate", 30)

        order_id = optional_string(body, "orderId", 100)
        notes = optional_string(body, "notes", 2000)

        status = body.get("status", "Draft")

        if not isinstance(status, str) or status not in ALLOWED_STATUSES:
            raise ValueError(
                "status must be Draft, Sent, Partially Paid, Paid, "
                "Overdue, or Void."
            )

        items = validate_items(body)

        subtotal = sum(
            (item["lineTotal"] for item in items),
            Decimal("0.00"),
        )

        tax = parse_money(body, "tax")
        total = (subtotal + tax).quantize(Decimal("0.01"))
        amount_paid = parse_money(body, "amountPaid")
        balance_due = (total - amount_paid).quantize(Decimal("0.01"))

        if balance_due < 0:
            raise ValueError("amountPaid cannot be greater than total.")

        now = datetime.now(timezone.utc).isoformat()
        invoice_id = str(uuid.uuid4())
        invoice_number = f"INV-{now[:4].replace('-', '')}-{invoice_id[:8].upper()}"

        invoice = {
            "companyId": company_id,
            "invoiceId": invoice_id,
            "invoiceNumber": invoice_number,
            "orderId": order_id,
            "customerId": customer_id,
            "businessName": business_name,
            "status": status,
            "issueDate": issue_date,
            "dueDate": due_date,
            "subtotal": subtotal,
            "tax": tax,
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
                "attribute_not_exists(companyId) "
                "AND attribute_not_exists(invoiceId)"
            ),
        )

        logger.info(
            "Created invoice %s for company %s",
            invoice_id,
            company_id,
        )

        return api_response(
            201,
            {
                "message": "Invoice created successfully.",
                "invoice": invoice,
            },
        )

    except PermissionError as error:
        return api_response(403, {"message": str(error)})

    except ValueError as error:
        return api_response(400, {"message": str(error)})

    except ClientError:
        logger.exception("DynamoDB error while creating invoice.")

        return api_response(
            500,
            {"message": "Unable to create invoice."},
        )

    except Exception:
        logger.exception("Unexpected error while creating invoice.")

        return api_response(
            500,
            {"message": "Internal server error."},
        )
