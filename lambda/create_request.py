import json
import boto3
import os
import uuid
from datetime import datetime, timezone

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["REQUESTS_TABLE"])


def lambda_handler(event, context):
    try:
        body = json.loads(event["body"])

        request = {
            "requestId": str(uuid.uuid4()),
            "customerId": body["customerId"],
            "businessName": body["businessName"],
            "productId": body["productId"],
            "productName": body["productName"],
            "quantityRequested": int(body["quantityRequested"]),
            "status": "New",
            "requestedAt": datetime.now(timezone.utc).isoformat()
        }

        table.put_item(Item=request)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Product request created successfully",
                "request": request
            })
        }

    except Exception as error:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "Error creating product request",
                "error": str(error)
            })
        }
