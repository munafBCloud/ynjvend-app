from datetime import datetime, timezone
from decimal import Decimal

import boto3


REGION = "us-east-1"
SOURCE_TABLE = "ynj-dev-inventory"
TARGET_TABLE = "ynj-dev-inventory-v2"
COMPANY_ID = "company-ynj-001"


dynamodb = boto3.resource("dynamodb", region_name=REGION)
source_table = dynamodb.Table(SOURCE_TABLE)
target_table = dynamodb.Table(TARGET_TABLE)


def scan_all_items(table):
    items = []
    response = table.scan()
    items.extend(response.get("Items", []))

    while "LastEvaluatedKey" in response:
        response = table.scan(
            ExclusiveStartKey=response["LastEvaluatedKey"]
        )
        items.extend(response.get("Items", []))

    return items


def normalize_money(value):
    if value is None or value == "":
        return Decimal("0.00")

    return Decimal(str(value))


def normalize_integer(value):
    if value is None or value == "":
        return 0

    return int(value)


def main():
    items = scan_all_items(source_table)
    migrated_count = 0

    with target_table.batch_writer(
        overwrite_by_pkeys=["companyId", "productId"]
    ) as batch:
        for item in items:
            created_at = item.get(
                "createdAt",
                datetime.now(timezone.utc).isoformat(),
            )

            migrated_item = {
                "companyId": COMPANY_ID,
                "productId": str(item["productId"]),
                "productName": str(item.get("productName", "")).strip(),
                "brand": str(item.get("brand", "")).strip(),
                "caseCost": normalize_money(item.get("caseCost")),
                "sellingPrice": Decimal("0.00"),
                "quantityInStock": normalize_integer(
                    item.get("quantityInStock")
                ),
                "reorderLevel": normalize_integer(
                    item.get(
                        "lowStock",
                        item.get("lowStockThreshold", 0),
                    )
                ),
                "status": "active",
                "createdAt": created_at,
                "updatedAt": created_at,
            }

            batch.put_item(Item=migrated_item)
            migrated_count += 1

            print(
                f"Migrated: {migrated_item['productName']} "
                f"({migrated_item['productId']})"
            )

    print(
        f"\nMigration complete: {migrated_count} item(s) "
        f"written to {TARGET_TABLE}"
    )


if __name__ == "__main__":
    main()
