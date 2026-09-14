import json
import logging
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["COMPANIES_TABLE"])


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)

        return super().default(obj)


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def get_company_id(event):
    try:
        claims = (
            event["requestContext"]
            ["authorizer"]
            ["jwt"]
            ["claims"]
        )

        company_id = claims.get("custom:companyId", "")

        if not isinstance(company_id, str):
            return ""

        return company_id.strip()

    except (KeyError, TypeError, AttributeError):
        return ""


def lambda_handler(event, context):
    company_id = get_company_id(event)

    if not company_id:
        logger.warning(
            "Authenticated request is missing custom:companyId"
        )

        return response(
            403,
            {
                "message": (
                    "Your account is not assigned to a company"
                )
            },
        )

    try:
        result = table.get_item(
            Key={"companyId": company_id},
            ConsistentRead=True,
        )

        company = result.get("Item")

        if not company:
            logger.warning(
                "Company record not found for authenticated company %s",
                company_id,
            )

            return response(
                404,
                {"message": "Company profile not found"},
            )

        return response(
            200,
            {"company": company},
        )

    except ClientError:
        logger.exception(
            "DynamoDB error while retrieving company profile"
        )

        return response(
            500,
            {"message": "Unable to retrieve company profile"},
        )

    except Exception:
        logger.exception(
            "Unexpected error while retrieving company profile"
        )

        return response(
            500,
            {"message": "Internal server error"},
        )
