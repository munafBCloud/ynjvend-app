import json
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["CUSTOMERS_TABLE"])

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "PUT,OPTIONS",
}


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }


def get_company_id(event):
    try:
        claims = (
            event["requestContext"]
            ["authorizer"]
            ["jwt"]
            ["claims"]
        )
        return claims.get("custom:companyId")
    except (KeyError, TypeError):
        return None


def lambda_handler(event, context):
    company_id = get_company_id(event)

    if not company_id:
        return response(
            403,
            {"message": "Your account is not assigned to a company"},
        )

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Request body must be valid JSON"})

    customer_id = str(body.get("customerId", "")).strip()

    if not customer_id:
        return response(400, {"message": "customerId is required"})

    allowed_fields = {
        "businessName",
        "contactName",
        "phone",
        "locationAddress",
        "status",
    }

    updates = {
        field: body[field]
        for field in allowed_fields
        if field in body
    }

    if not updates:
        return response(
            400,
            {"message": "At least one editable customer field is required"},
        )

    expression_names = {}
    expression_values = {}
    set_expressions = []

    for index, (field, value) in enumerate(updates.items()):
        name_key = f"#field{index}"
        value_key = f":value{index}"

        expression_names[name_key] = field
        expression_values[value_key] = value
        set_expressions.append(f"{name_key} = {value_key}")

    expression_names["#updatedAt"] = "updatedAt"
    expression_values[":updatedAt"] = datetime.now(
        timezone.utc
    ).isoformat()

    set_expressions.append("#updatedAt = :updatedAt")

    try:
        result = table.update_item(
            Key={
                "companyId": company_id,
                "customerId": customer_id,
            },
            UpdateExpression="SET " + ", ".join(set_expressions),
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values,
            ConditionExpression=(
                "attribute_exists(companyId) "
                "AND attribute_exists(customerId)"
            ),
            ReturnValues="ALL_NEW",
        )

        return response(
            200,
            {
                "message": "Customer updated successfully",
                "customer": result["Attributes"],
            },
        )

    except ClientError as error:
        error_code = error.response["Error"]["Code"]

        if error_code == "ConditionalCheckFailedException":
            return response(404, {"message": "Customer not found"})

        print(f"Update customer error: {error}")
        return response(500, {"message": "Unable to update customer"})
