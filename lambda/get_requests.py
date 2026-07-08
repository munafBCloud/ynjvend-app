import json
import boto3
import os
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["REQUESTS_TABLE"])


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def lambda_handler(event, context):
    try:
        response = table.scan()
        requests = response.get("Items", [])

        return {
            "statusCode": 200,
            "body": json.dumps({
                "requests": requests,
                "count": len(requests)
            }, cls=DecimalEncoder)
        }

    except Exception as error:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "Error retrieving product requests",
                "error": str(error)
            })
        }
