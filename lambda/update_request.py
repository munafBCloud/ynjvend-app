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
        body = json.loads(event["body"])

        request_id = body["requestId"]
        status = body["status"]

        response = table.update_item(
            Key={
                "requestId": request_id
            },
            UpdateExpression="SET #status = :status",
            ExpressionAttributeNames={
                "#status": "status"
            },
            ExpressionAttributeValues={
                ":status": status
            },
            ReturnValues="ALL_NEW"
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Product request updated successfully",
                "request": response["Attributes"]
            }, cls=DecimalEncoder)
        }

    except Exception as error:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "Error updating product request",
                "error": str(error)
            })
        }
