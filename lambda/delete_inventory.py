import json
import os
import boto3
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["INVENTORY_TABLE_NAME"])

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))

        product_id = body.get("productId")

        if not product_id:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "message": "productId is required"
                })
            }

        response = table.delete_item(
            Key={
                "productId": product_id
            },
            ReturnValues="ALL_OLD"
        )

        deleted_item = response.get("Attributes")

        if not deleted_item:
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "message": "Inventory item not found"
                })
            }

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "message": "Inventory item deleted successfully",
                "deletedItem": deleted_item
            }, default=decimal_default)
        }

    except Exception as error:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "message": "Error deleting inventory item",
                "error": str(error)
            })
        }
