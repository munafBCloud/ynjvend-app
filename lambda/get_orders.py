import json
import logging
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
orders_table = dynamodb.Table(os.environ["ORDERS_TABLE"])


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)

        return super().default(obj)


def api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def scan_all_orders():
    orders = []
    scan_arguments = {}

    while True:
        response = orders_table.scan(**scan_arguments)

        orders.extend(response.get("Items", []))

        last_evaluated_key = response.get(
            "LastEvaluatedKey"
        )

        if not last_evaluated_key:
            break

        scan_arguments["ExclusiveStartKey"] = (
            last_evaluated_key
        )

    return orders


def lambda_handler(event, context):
    try:
        orders = scan_all_orders()

        orders.sort(
            key=lambda order: order.get(
                "createdAt",
                "",
            ),
            reverse=True,
        )

        logger.info(
            "Retrieved %s orders",
            len(orders),
        )

        return api_response(
            200,
            {
                "orders": orders,
                "count": len(orders),
            },
        )

    except ClientError:
        logger.exception(
            "DynamoDB error while retrieving orders"
        )

        return api_response(
            500,
            {
                "message": "Unable to retrieve orders"
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error while retrieving orders"
        )

        return api_response(
            500,
            {
                "message": "Internal server error"
            },
        )
