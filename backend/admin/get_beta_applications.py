import json
import logging
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
beta_applications_table = dynamodb.Table(
    os.environ["BETA_APPLICATIONS_TABLE"]
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

    # API Gateway HTTP API serializes Cognito group arrays into
    # a bracketed string. Observed TEST representation:
    # "[Admins PlatformAdmins]".
    #
    # Also accept comma-separated representations so the parser
    # remains compatible with existing test/event formats.
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


def scan_all_applications():
    applications = []
    scan_arguments = {}

    while True:
        response = beta_applications_table.scan(**scan_arguments)

        applications.extend(response.get("Items", []))

        last_evaluated_key = response.get("LastEvaluatedKey")

        if not last_evaluated_key:
            break

        scan_arguments["ExclusiveStartKey"] = last_evaluated_key

    return applications


def lambda_handler(event, context):
    try:
        if not is_platform_admin(event):
            logger.warning(
                "Platform admin authorization denied"
            )

            return api_response(
                403,
                {
                    "message": "Platform administrator access required."
                },
            )

        applications = scan_all_applications()

        applications.sort(
            key=lambda application: application.get(
                "submittedAt",
                ""
            ),
            reverse=True,
        )

        logger.info(
            "Retrieved %s beta applications for platform admin",
            len(applications),
        )

        return api_response(
            200,
            {
                "applications": applications,
                "count": len(applications),
            },
        )

    except ClientError:
        logger.exception(
            "DynamoDB error while retrieving beta applications"
        )

        return api_response(
            500,
            {
                "message": "Unable to retrieve beta applications."
            },
        )

    except Exception:
        logger.exception(
            "Unexpected error while retrieving beta applications"
        )

        return api_response(
            500,
            {
                "message": "Internal server error."
            },
        )
