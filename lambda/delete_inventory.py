import json
import logging
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
dynamodb_client = boto3.client("dynamodb")

inventory_table = dynamodb.Table(
    os.environ["INVENTORY_TABLE_NAME"]
)

barcode_registry_table_name = os.environ[
    "BARCODE_REGISTRY_TABLE"
]

serializer = TypeSerializer()


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


def serialize_item(item):
    return {
        key: serializer.serialize(value)
        for key, value in item.items()
    }


def delete_product_with_barcode(
    company_id,
    product_id,
    barcode,
):
    dynamodb_client.transact_write_items(
        TransactItems=[
            {
                "Delete": {
                    "TableName": inventory_table.name,
                    "Key": serialize_item(
                        {
                            "companyId": company_id,
                            "productId": product_id,
                        }
                    ),
                    "ConditionExpression": (
                        "attribute_exists(companyId) "
                        "AND attribute_exists(productId)"
                    ),
                }
            },
            {
                "Delete": {
                    "TableName": barcode_registry_table_name,
                    "Key": serialize_item(
                        {
                            "companyId": company_id,
                            "barcode": barcode,
                        }
                    ),
                    "ConditionExpression": (
                        "attribute_exists(companyId) "
                        "AND attribute_exists(barcode) "
                        "AND productId = :productId"
                    ),
                    "ExpressionAttributeValues": {
                        ":productId": serializer.serialize(
                            product_id
                        ),
                    },
                }
            },
        ]
    )


def delete_product_without_barcode(
    company_id,
    product_id,
):
    inventory_table.delete_item(
        Key={
            "companyId": company_id,
            "productId": product_id,
        },
        ConditionExpression=(
            "attribute_exists(companyId) "
            "AND attribute_exists(productId)"
        ),
    )


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

        product_id = str(
            body.get("productId", "")
        ).strip()

        if not product_id:
            return response(
                400,
                {
                    "message": "productId is required."
                },
            )

        get_result = inventory_table.get_item(
            Key={
                "companyId": company_id,
                "productId": product_id,
            },
            ConsistentRead=True,
        )

        item = get_result.get("Item")

        if not item:
            return response(
                404,
                {
                    "message": "Inventory product not found."
                },
            )

        barcode = str(
            item.get("barcode", "")
        ).strip()

        if barcode:
            delete_product_with_barcode(
                company_id,
                product_id,
                barcode,
            )
        else:
            delete_product_without_barcode(
                company_id,
                product_id,
            )

        return response(
            200,
            {
                "message": "Inventory product deleted successfully.",
                "deletedItem": item,
            },
        )

    except ClientError as error:
        error_code = (
            error.response
            .get("Error", {})
            .get("Code", "")
        )

        if error_code in {
            "ConditionalCheckFailedException",
            "TransactionCanceledException",
        }:
            logger.warning(
                "Inventory delete integrity check failed "
                "for tenant-scoped product."
            )

            return response(
                409,
                {
                    "message": (
                        "Inventory product could not be deleted "
                        "because its data changed or its barcode "
                        "mapping is inconsistent."
                    )
                },
            )

        logger.exception(
            "DynamoDB error deleting inventory product"
        )

        return response(
            500,
            {
                "message": "Unable to delete inventory product."
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error deleting inventory product"
        )

        return response(
            500,
            {
                "message": "Unable to delete inventory product."
            },
        )
