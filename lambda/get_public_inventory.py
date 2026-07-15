import json
import logging
import os
from decimal import Decimal

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["INVENTORY_TABLE_NAME"])


def decimal_default(value):
    """Convert DynamoDB Decimal values into JSON-compatible numbers."""
    if isinstance(value, Decimal):
        return float(value)

    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def lambda_handler(event, context):
    try:
        response = table.scan()
        items = response.get("Items", [])

        public_items = []

        for item in items:
            quantity_in_stock = int(item.get("quantityInStock", 0))
            low_stock_threshold = int(item.get("lowStockThreshold", 0))

            if quantity_in_stock <= 0:
                availability = "Unavailable"
            elif quantity_in_stock <= low_stock_threshold:
                availability = "Low Stock"
            else:
                availability = "In Stock"

            public_items.append(
                {
                    "productId": item.get("productId", ""),
                    "productName": item.get("productName", ""),
                    "brand": item.get("brand", ""),
                    "availability": availability,
                }
            )

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(
                {
                    "count": len(public_items),
                    "items": public_items,
                },
                default=decimal_default,
            ),
        }

    except Exception:
        logger.exception("Error retrieving public inventory")

        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(
                {
                    "message": "Unable to retrieve inventory at this time."
                }
            ),
        }
