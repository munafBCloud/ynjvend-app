import json
import logging
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
companies_table = dynamodb.Table(
    os.environ["COMPANIES_TABLE"]
)

PLATFORM_ADMIN_GROUP = "PlatformAdmins"


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


def get_jwt_claims(event):
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    return claims if isinstance(claims, dict) else {}


def get_cognito_groups(event):
    claims = get_jwt_claims(event)
    groups = claims.get("cognito:groups")

    if isinstance(groups, list):
        return {
            group.strip()
            for group in groups
            if isinstance(group, str) and group.strip()
        }

    if not isinstance(groups, str):
        return set()

    value = groups.strip()

    if not value:
        return set()

    if value.startswith("[") and value.endswith("]"):
        value = value[1:-1]

    normalized = value.replace(",", " ")

    return {
        group.strip().strip('"').strip("'")
        for group in normalized.split()
        if group.strip()
    }


def is_platform_admin(event):
    return PLATFORM_ADMIN_GROUP in get_cognito_groups(event)


def get_company(company_id):
    response = companies_table.get_item(
        Key={"companyId": company_id}
    )

    return response.get("Item")


def scan_all_companies():
    companies = []
    scan_arguments = {}

    while True:
        response = companies_table.scan(**scan_arguments)

        companies.extend(response.get("Items", []))

        last_evaluated_key = response.get("LastEvaluatedKey")

        if not last_evaluated_key:
            break

        scan_arguments["ExclusiveStartKey"] = last_evaluated_key

    return companies


def lambda_handler(event, context):
    try:
        if not is_platform_admin(event):
            logger.warning(
                "Platform admin company authorization denied"
            )

            return api_response(
                403,
                {
                    "message":
                        "Platform administrator access required."
                },
            )

        path_parameters = event.get("pathParameters") or {}
        company_id = path_parameters.get("companyId")

        if company_id is not None:
            company_id = str(company_id).strip()

            if not company_id:
                return api_response(
                    400,
                    {
                        "message": "Company ID is required."
                    },
                )

            company = get_company(company_id)

            if company is None:
                return api_response(
                    404,
                    {
                        "message": "Company not found."
                    },
                )

            logger.info(
                "Retrieved company %s for platform admin",
                company_id,
            )

            return api_response(
                200,
                {
                    "company": company,
                },
            )

        companies = scan_all_companies()

        companies.sort(
            key=lambda company: company.get(
                "createdAt",
                ""
            ),
            reverse=True,
        )

        logger.info(
            "Retrieved %s companies for platform admin",
            len(companies),
        )

        return api_response(
            200,
            {
                "companies": companies,
                "count": len(companies),
            },
        )

    except ClientError:
        logger.exception(
            "DynamoDB error while retrieving companies"
        )

        return api_response(
            500,
            {
                "message": "Unable to retrieve companies."
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error while retrieving companies"
        )

        return api_response(
            500,
            {
                "message": "Internal server error."
            },
        )
