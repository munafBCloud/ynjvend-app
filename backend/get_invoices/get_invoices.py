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
invoices_table = dynamodb.Table(os.environ["INVOICES_TABLE"])


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

    if not isinstance(company_id, str) or not company_id.strip():
        raise PermissionError("Authenticated user is missing company access.")

    return company_id.strip()


def query_all_invoices(company_id):
    invoices = []
    query_arguments = {
        "KeyConditionExpression": Key("companyId").eq(company_id),
    }

    while True:
        response = invoices_table.query(**query_arguments)
        invoices.extend(response.get("Items", []))

        last_evaluated_key = response.get("LastEvaluatedKey")

        if not last_evaluated_key:
            break

        query_arguments["ExclusiveStartKey"] = last_evaluated_key

    return invoices


def lambda_handler(event, context):
    try:
        company_id = get_company_id(event)
        invoices = query_all_invoices(company_id)

        invoices.sort(
            key=lambda invoice: invoice.get("createdAt", ""),
            reverse=True,
        )

        logger.info(
            "Retrieved %s invoices for company %s",
            len(invoices),
            company_id,
        )

        return api_response(
            200,
            {
                "invoices": invoices,
                "count": len(invoices),
            },
        )

    except PermissionError as error:
        return api_response(403, {"message": str(error)})

    except ClientError:
        logger.exception("DynamoDB error while retrieving invoices.")

        return api_response(
            500,
            {"message": "Unable to retrieve invoices."},
        )

    except Exception:
        logger.exception("Unexpected error while retrieving invoices.")

        return api_response(
            500,
            {"message": "Internal server error."},
        )
