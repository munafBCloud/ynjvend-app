import json
import os

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["CUSTOMERS_TABLE"])

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "DELETE,OPTIONS",
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

    try:
        result = table.delete_item(
            Key={
                "companyId": company_id,
                "customerId": customer_id,
            },
            ConditionExpression=(
                "attribute_exists(companyId) "
                "AND attribute_exists(customerId)"
            ),
            ReturnValues="ALL_OLD",
        )

        return response(
            200,
            {
                "message": "Customer deleted successfully",
                "customer": result.get("Attributes"),
            },
        )

    except ClientError as error:
        error_code = error.response["Error"]["Code"]

        if error_code == "ConditionalCheckFailedException":
            return response(404, {"message": "Customer not found"})

        print(f"Delete customer error: {error}")
        return response(500, {"message": "Unable to delete customer"})
