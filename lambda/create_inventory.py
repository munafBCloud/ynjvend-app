import json
import os
import uuid
from datetime import datetime,timezone

import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["INVENTORY_TABLE_NAME"])

def handler(event, context):
    try:
        body = json.loads(event.get("body","{}"))

        product_id = body.get("productId") or str(uuid.uuid4())

        item = {
            "productId": product_id,
            "productName": body.get("productName", ""),
            "brand": body.get("brand", ""),
            "caseCost": str(body.get("caseCost", "0")),
            "quantityInStock": int(body.get("quantityInStock", "0")),
            "lowStock": int(body.get("lowStock",0)),
            "createdAt": datetime.now(timezone.utc).isoformat()
        }

        table.put_item(Item=item)

        return {
           "statusCode": 200,
           "headers": {
               "Content-Type": "application/json",
               "Access-Control-Allow-Origin": "*"
           },
           "body": json.dumps({
              "message": "Inventory product created successfully",
              "item": item
           })
         }

    except Exception as error:
      return {
         "statusCode": 500,
         "headers": {
             "Content-Type": "application/json",
             "Access-Control-Allow-Origin": "*"
         },
         "body": json.dumps({
            "error": str(error)
         })
      }
