import json
import os
import re
import uuid
from datetime import datetime, timezone

import boto3


dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["BETA_APPLICATIONS_TABLE"])

ses = boto3.client("sesv2")

notification_from_email = os.environ.get("NOTIFICATION_FROM_EMAIL", "")
notification_to_email = os.environ.get("NOTIFICATION_TO_EMAIL", "")


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }


def clean_string(value):
    if not isinstance(value, str):
        return ""
    return value.strip()


def send_internal_notification(item):
    if not notification_from_email or not notification_to_email:
        print(
            json.dumps(
                {
                    "level": "WARNING",
                    "event": "beta_notification_not_configured",
                    "applicationId": item["applicationId"],
                }
            )
        )
        return

    subject = f"New Distro'Dex Beta Application — {item['businessName']}"

    body = f"""New Distro'Dex Founding Beta Application

BUSINESS
Business Name: {item['businessName']}
Contact Name: {item['contactName']}
Email: {item['email']}
Phone: {item.get('phone', 'Not provided')}

DISTRIBUTION PROFILE
Distribution Type: {item['distributionType']}
SKU Range: {item.get('skuRange', 'Not provided')}
Team Size: {item.get('teamSize', 'Not provided')}
Current System: {item['currentSystem']}

BIGGEST OPERATIONAL PROBLEM
{item['biggestProblem']}

ADDITIONAL NOTES
{item.get('notes', 'None provided')}

APPLICATION DETAILS
Application ID: {item['applicationId']}
Submitted At: {item['submittedAt']}
Status: {item['status']}
Source: {item['source']}
"""

    ses.send_email(
        FromEmailAddress=notification_from_email,
        Destination={
            "ToAddresses": [notification_to_email],
        },
        ReplyToAddresses=[item["email"]],
        Content={
            "Simple": {
                "Subject": {
                    "Data": subject,
                    "Charset": "UTF-8",
                },
                "Body": {
                    "Text": {
                        "Data": body,
                        "Charset": "UTF-8",
                    }
                },
            }
        },
    )


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, TypeError):
        return response(400, {"message": "Invalid JSON body."})

    if not isinstance(body, dict):
        return response(400, {"message": "Request body must be an object."})

    business_name = clean_string(body.get("businessName"))
    contact_name = clean_string(body.get("contactName"))
    email = clean_string(body.get("email")).lower()
    phone = clean_string(body.get("phone"))
    distribution_type = clean_string(body.get("distributionType"))
    sku_range = clean_string(body.get("skuRange"))
    team_size = clean_string(body.get("teamSize"))
    current_system = clean_string(body.get("currentSystem"))
    biggest_problem = clean_string(body.get("biggestProblem"))
    notes = clean_string(body.get("notes"))

    required = {
        "businessName": business_name,
        "contactName": contact_name,
        "email": email,
        "distributionType": distribution_type,
        "currentSystem": current_system,
        "biggestProblem": biggest_problem,
    }

    missing = [field for field, value in required.items() if not value]

    if missing:
        return response(
            400,
            {
                "message": "Missing required fields.",
                "fields": missing,
            },
        )

    limits = {
        "businessName": (business_name, 120),
        "contactName": (contact_name, 100),
        "email": (email, 254),
        "phone": (phone, 40),
        "distributionType": (distribution_type, 100),
        "skuRange": (sku_range, 50),
        "teamSize": (team_size, 50),
        "currentSystem": (current_system, 100),
        "biggestProblem": (biggest_problem, 1000),
        "notes": (notes, 2000),
    }

    for field, (value, max_length) in limits.items():
        if len(value) > max_length:
            return response(
                400,
                {"message": f"{field} exceeds maximum length."},
            )

    email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

    if not re.match(email_pattern, email):
        return response(
            400,
            {"message": "Enter a valid email address."},
        )

    application_id = str(uuid.uuid4())
    submitted_at = datetime.now(timezone.utc).isoformat()

    item = {
        "applicationId": application_id,
        "businessName": business_name,
        "contactName": contact_name,
        "email": email,
        "distributionType": distribution_type,
        "currentSystem": current_system,
        "biggestProblem": biggest_problem,
        "status": "submitted",
        "submittedAt": submitted_at,
        "source": "distrodex-marketing-site",
    }

    optional_fields = {
        "phone": phone,
        "skuRange": sku_range,
        "teamSize": team_size,
        "notes": notes,
    }

    for field, value in optional_fields.items():
        if value:
            item[field] = value

    try:
        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(applicationId)",
        )
    except Exception:
        print(
            json.dumps(
                {
                    "level": "ERROR",
                    "event": "beta_application_write_failed",
                    "applicationId": application_id,
                }
            )
        )

        return response(
            500,
            {"message": "Unable to submit application."},
        )

    print(
        json.dumps(
            {
                "level": "INFO",
                "event": "beta_application_submitted",
                "applicationId": application_id,
            }
        )
    )

    try:
        send_internal_notification(item)

        print(
            json.dumps(
                {
                    "level": "INFO",
                    "event": "beta_notification_sent",
                    "applicationId": application_id,
                }
            )
        )
    except Exception as exc:
        print(
            json.dumps(
                {
                    "level": "ERROR",
                    "event": "beta_notification_failed",
                    "applicationId": application_id,
                    "errorType": type(exc).__name__,
                }
            )
        )

    return response(
        201,
        {
            "message": "Application submitted.",
            "applicationId": application_id,
        },
    )
