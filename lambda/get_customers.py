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
table = dynamodb.Table(os.environ["CUSTOMERS_TABLE"])


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)

        return super().default(obj)


def api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(
            body,
            cls=DecimalEncoder
        )
    }


def get_jwt_claims(event):
    return (
        event
        .get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )


def get_company_id(event):
    claims = get_jwt_claims(event)

    company_id = claims.get("custom:companyId")

    if not isinstance(company_id, str):
        return None

    company_id = company_id.strip()

    return company_id or None


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
                        "Your account is not assigned to a company"
                    )
                }
            )

        customers = []
        query_arguments = {
            "KeyConditionExpression": Key("companyId").eq(
                company_id
            )
        }

        while True:
            response = table.query(**query_arguments)

            customers.extend(
                response.get("Items", [])
            )

            last_evaluated_key = response.get(
                "LastEvaluatedKey"
            )

            if not last_evaluated_key:
                break

            query_arguments["ExclusiveStartKey"] = (
                last_evaluated_key
            )

        customers.sort(
            key=lambda customer: customer
            .get("businessName", "")
            .lower()
        )

        logger.info(
            "Retrieved %s customers for company %s",
            len(customers),
            company_id,
        )

        return api_response(
            200,
            {
                "customers": customers,
                "count": len(customers),
            }
        )

    except ClientError:
        logger.exception(
            "DynamoDB error while retrieving customers"
        )

        return api_response(
            500,
            {"message": "Unable to retrieve customers"}
        )

    except Exception:
        logger.exception(
            "Unexpected error while retrieving customers"
        )

        return api_response(
            500,
            {"message": "Internal server error"}
        )
