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
invoices_table = dynamodb.Table(os.environ["INVOICES_TABLE"])

ALLOWED_STATUSES = {
    "Draft",
    "Sent",
    "Partially Paid",
    "Paid",
    "Overdue",
    "Void",
}

ALLOWED_FIELDS = {
    "status",
    "amountPaid",
    "notes",
    "dueDate",
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
        raise PermissionError(
            "Authenticated user is missing company access."
        )

    return company_id.strip()


def get_invoice_id(event):
    path_parameters = event.get("pathParameters") or {}
    invoice_id = path_parameters.get("invoiceId")

    if not isinstance(invoice_id, str) or not invoice_id.strip():
        raise ValueError("invoiceId is required.")

    invoice_id = invoice_id.strip()

    if len(invoice_id) > 100:
        raise ValueError(
            "invoiceId must be no more than 100 characters."
        )

    return invoice_id


def parse_body(event):
    raw_body = event.get("body")

    if not raw_body:
        raise ValueError("Request body is required.")

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

    if not body:
        raise ValueError(
            "At least one invoice field is required."
        )

    return body


def parse_money(value, field_name):
    if isinstance(value, bool):
        raise ValueError(
            f"{field_name} must be a valid number."
        )

    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as error:
        raise ValueError(
            f"{field_name} must be a valid number."
        ) from error

    if number < 0:
        raise ValueError(
            f"{field_name} cannot be negative."
        )

    return number.quantize(Decimal("0.01"))


def validate_status(value):
    if not isinstance(value, str):
        raise ValueError("status must be a string.")

    status = value.strip()

    if status not in ALLOWED_STATUSES:
        raise ValueError(
            "status must be Draft, Sent, Partially Paid, "
            "Paid, Overdue, or Void."
        )

    return status


def validate_optional_string(value, field_name, max_length):
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


def lambda_handler(event, context):
    try:
        company_id = get_company_id(event)
        invoice_id = get_invoice_id(event)
        body = parse_body(event)

        response = invoices_table.get_item(
            Key={
                "companyId": company_id,
                "invoiceId": invoice_id,
            },
            ConsistentRead=True,
        )

        existing_invoice = response.get("Item")

        if not existing_invoice:
            return api_response(
                404,
                {"message": "Invoice not found."},
            )

        total = existing_invoice.get("total")

        if not isinstance(total, Decimal):
            logger.error(
                "Invoice %s has an invalid total.",
                invoice_id,
            )

            return api_response(
                500,
                {"message": "Invoice data is invalid."},
            )

        update_fields = {}

        amount_paid = existing_invoice.get(
            "amountPaid",
            Decimal("0.00"),
        )

        if "amountPaid" in body:
            amount_paid = parse_money(
                body["amountPaid"],
                "amountPaid",
            )

            if amount_paid > total:
                raise ValueError(
                    "amountPaid cannot be greater than total."
                )

            update_fields["amountPaid"] = amount_paid
            update_fields["balanceDue"] = (
                total - amount_paid
            ).quantize(Decimal("0.01"))

        if "notes" in body:
            update_fields["notes"] = validate_optional_string(
                body["notes"],
                "notes",
                2000,
            )

        if "dueDate" in body:
            update_fields["dueDate"] = validate_optional_string(
                body["dueDate"],
                "dueDate",
                30,
            )

            if not update_fields["dueDate"]:
                raise ValueError("dueDate cannot be empty.")

        if "status" in body:
            update_fields["status"] = validate_status(
                body["status"]
            )

        balance_due = update_fields.get(
            "balanceDue",
            existing_invoice.get(
                "balanceDue",
                total - amount_paid,
            ),
        )

        requested_status = update_fields.get(
            "status",
            existing_invoice.get("status", "Draft"),
        )

        if requested_status != "Void":
            if amount_paid == total:
                update_fields["status"] = "Paid"
            elif amount_paid > 0:
                update_fields["status"] = "Partially Paid"
            elif requested_status in {
                "Paid",
                "Partially Paid",
            }:
                update_fields["status"] = "Sent"

        update_fields["balanceDue"] = balance_due
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

        updated_response = invoices_table.update_item(
            Key={
                "companyId": company_id,
                "invoiceId": invoice_id,
            },
            UpdateExpression=(
                "SET " + ", ".join(set_expressions)
            ),
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values,
            ConditionExpression=(
                "attribute_exists(companyId) "
                "AND attribute_exists(invoiceId)"
            ),
            ReturnValues="ALL_NEW",
        )

        updated_invoice = updated_response.get(
            "Attributes",
            {},
        )

        logger.info(
            "Updated invoice %s for company %s",
            invoice_id,
            company_id,
        )

        return api_response(
            200,
            {
                "message": "Invoice updated successfully.",
                "invoice": updated_invoice,
            },
        )

    except PermissionError as error:
        return api_response(
            403,
            {"message": str(error)},
        )

    except ValueError as error:
        return api_response(
            400,
            {"message": str(error)},
        )

    except ClientError as error:
        error_code = (
            error.response
            .get("Error", {})
            .get("Code", "")
        )

        if error_code == "ConditionalCheckFailedException":
            return api_response(
                404,
                {"message": "Invoice not found."},
            )

        logger.exception(
            "DynamoDB error while updating invoice."
        )

        return api_response(
            500,
            {"message": "Unable to update invoice."},
        )

    except Exception:
        logger.exception(
            "Unexpected error while updating invoice."
        )

        return api_response(
            500,
            {"message": "Internal server error."},
        )
