import json
import logging
import os
from decimal import Decimal

import boto3


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")

inventory_table = dynamodb.Table(
    os.environ["INVENTORY_TABLE_NAME"]
)

barcode_table = dynamodb.Table(
    os.environ["BARCODE_REGISTRY_TABLE"]
)


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

        path_parameters = event.get("pathParameters") or {}

        barcode = str(
            path_parameters.get("barcode", "")
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
                "Barcode registry item missing productId: "
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

        item = inventory_response.get("Item")

        if not item:
            logger.error(
                "Barcode points to missing inventory product: "
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

        return response(
            200,
            {
                "item": item,
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error retrieving inventory by barcode"
        )

        return response(
            500,
            {
                "message": (
                    "Unable to retrieve inventory product by barcode."
                )
            },
        )
