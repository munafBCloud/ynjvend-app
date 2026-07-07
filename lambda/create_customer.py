import json
import boto3
import os
import uuid

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["CUSTOMERS_TABLE"])


def lambda_handler(event, context):
    try:
        body = json.loads(event["body"])

        customer = {
            "customerId": str(uuid.uuid4()),
            "businessName": body["businessName"],
            "contactName": body["contactName"],
            "phone": body["phone"],
            "locationAddress": body["locationAddress"]
        }

        table.put_item(Item=customer)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Customer created successfully",
                "customer": customer
            })
        }

    except Exception as error:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "Error creating customer",
                "error": str(error)
            })
        }
