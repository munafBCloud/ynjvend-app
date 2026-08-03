import json
import logging
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
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

    if not isinstance(company_id, str):
        return ""

    return company_id.strip()


def query_all_orders(company_id):
    orders = []

    query_arguments = {
        "KeyConditionExpression": Key("companyId").eq(company_id),
    }

    while True:
        response = orders_table.query(**query_arguments)

        orders.extend(response.get("Items", []))

        last_evaluated_key = response.get("LastEvaluatedKey")

        if not last_evaluated_key:
            break

        query_arguments["ExclusiveStartKey"] = last_evaluated_key

    return orders


def lambda_handler(event, context):
    try:
        company_id = get_company_id(event)

        if not company_id:
            logger.warning(
                "Authenticated request is missing custom:companyId"
            )

            return api_response(
                403,
                {
                    "message": (
                        "Company access could not be verified."
                    )
                },
            )

        orders = query_all_orders(company_id)

        orders.sort(
            key=lambda order: order.get("createdAt", ""),
            reverse=True,
        )

        logger.info(
            "Retrieved %s orders for company %s",
            len(orders),
            company_id,
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
                "message": "Unable to retrieve orders."
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error while retrieving orders"
        )

        return api_response(
            500,
            {
                "message": "Internal server error."
            },
        )
