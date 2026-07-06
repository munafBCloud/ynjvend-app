import json
import os
import boto3
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["INVENTORY_TABLE_NAME"])

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

        update_fields = {}

        allowed_fields = [
            "productName",
            "brand",
            "caseCost",
            "sellingPrice",
            "quantityInStock",
            "lowStockThreshold"
        ]

        for field in allowed_fields:
            if field in body:
                value = body[field]

                if field in ["caseCost", "sellingPrice"]:
                    value = Decimal(str(value))

                if field in ["quantityInStock", "lowStockThreshold"]:
                    value = int(value)

                update_fields[field] = value

        if not update_fields:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "message": "No valid fields provided to update"
                })
            }

        update_expression = "SET "
        expression_attribute_values = {}

        for index, (key, value) in enumerate(update_fields.items()):
            placeholder = f":value{index}"
            update_expression += f"{key} = {placeholder}, "
            expression_attribute_values[placeholder] = value

        update_expression = update_expression.rstrip(", ")

        response = table.update_item(
            Key={
                "productId": product_id
            },
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW"
        )

        updated_item = response.get("Attributes", {})

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "message": "Inventory item updated successfully",
                "item": updated_item
            }, default=str)
        }

    except Exception as error:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "message": "Error updating inventory item",
                "error": str(error)
            })
        }
