import json
import logging
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["INVENTORY_TABLE_NAME"])


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

        dynamodb_response = table.delete_item(
            Key={
                "companyId": company_id,
                "productId": product_id,
            },
            ConditionExpression=(
                "attribute_exists(companyId) "
                "AND attribute_exists(productId)"
            ),
            ReturnValues="ALL_OLD",
        )

        return response(
            200,
            {
                "message": "Inventory product deleted successfully.",
                "deletedItem": dynamodb_response.get(
                    "Attributes",
                    {},
                ),
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

        logger.exception("DynamoDB error deleting inventory product")

        return response(
            500,
            {
                "message": "Unable to delete inventory product."
            },
        )

    except Exception:
        logger.exception("Unexpected error deleting inventory product")

        return response(
            500,
            {
                "message": "Unable to delete inventory product."
            },
        )
