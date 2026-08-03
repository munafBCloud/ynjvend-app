import json
import logging
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key


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

        items = []

        query_arguments = {
            "KeyConditionExpression": (
                Key("companyId").eq(company_id)
            )
        }

        while True:
            query_response = table.query(**query_arguments)

            items.extend(
                query_response.get("Items", [])
            )

            last_evaluated_key = query_response.get(
                "LastEvaluatedKey"
            )

            if not last_evaluated_key:
                break

            query_arguments["ExclusiveStartKey"] = (
                last_evaluated_key
            )

        items.sort(
            key=lambda item: (
                str(item.get("productName", "")).lower(),
                str(item.get("productId", "")),
            )
        )

        return response(
            200,
            {
                "count": len(items),
                "items": items,
            },
        )

    except Exception:
        logger.exception("Error retrieving inventory")

        return response(
            500,
            {
                "message": "Unable to retrieve inventory."
            },
        )
