import argparse
import logging
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError


logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(message)s",
)

logger = logging.getLogger(__name__)

DEFAULT_SOURCE_TABLE = "ynj-dev-orders"
DEFAULT_DESTINATION_TABLE = "ynj-dev-orders-v2"
DEFAULT_COMPANY_ID = "company-ynj-001"
DEFAULT_REGION = "us-east-1"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def scan_all_items(table):
    items = []
    scan_arguments = {}

    while True:
        response = table.scan(**scan_arguments)
        items.extend(response.get("Items", []))

        last_evaluated_key = response.get("LastEvaluatedKey")

        if not last_evaluated_key:
            break

        scan_arguments["ExclusiveStartKey"] = last_evaluated_key

    return items


def prepare_order(order: dict, company_id: str) -> dict:
    migrated_order = dict(order)

    order_id = migrated_order.get("orderId")

    if not isinstance(order_id, str) or not order_id.strip():
        raise ValueError("Order is missing a valid orderId")

    customer_id = migrated_order.get("customerId")

    if not isinstance(customer_id, str) or not customer_id.strip():
        raise ValueError(
            f"Order {order_id} is missing a valid customerId"
        )

    migrated_order["companyId"] = company_id
    migrated_order["orderId"] = order_id.strip()
    migrated_order["customerId"] = customer_id.strip()

    migrated_order.setdefault("businessName", "")
    migrated_order.setdefault("items", [])
    migrated_order.setdefault("notes", "")
    migrated_order.setdefault("status", "New")

    timestamp = utc_now()

    migrated_order.setdefault("createdAt", timestamp)
    migrated_order.setdefault("updatedAt", timestamp)

    # Financial fields are added now for future invoicing support.
    # Existing orders did not store prices, so migrated totals start at zero.
    migrated_order.setdefault("subtotal", Decimal("0"))
    migrated_order.setdefault("tax", Decimal("0"))
    migrated_order.setdefault("discount", Decimal("0"))
    migrated_order.setdefault("total", Decimal("0"))
    migrated_order.setdefault("paymentStatus", "Unpaid")

    return migrated_order


def migrate_orders(
    source_table_name: str,
    destination_table_name: str,
    company_id: str,
    region: str,
) -> None:
    dynamodb = boto3.resource("dynamodb", region_name=region)

    source_table = dynamodb.Table(source_table_name)
    destination_table = dynamodb.Table(destination_table_name)

    logger.info("Reading orders from %s", source_table_name)

    source_orders = scan_all_items(source_table)

    logger.info("Found %s order(s)", len(source_orders))

    migrated_count = 0
    skipped_count = 0
    failed_count = 0

    for source_order in source_orders:
        order_id = source_order.get("orderId", "unknown")

        try:
            migrated_order = prepare_order(
                source_order,
                company_id,
            )

            destination_table.put_item(
                Item=migrated_order,
                ConditionExpression=(
                    "attribute_not_exists(companyId) "
                    "AND attribute_not_exists(orderId)"
                ),
            )

            migrated_count += 1
            logger.info("Migrated order %s", order_id)

        except destination_table.meta.client.exceptions.ConditionalCheckFailedException:
            skipped_count += 1
            logger.warning(
                "Skipped order %s because it already exists",
                order_id,
            )

        except (ValueError, ClientError):
            failed_count += 1
            logger.exception(
                "Failed to migrate order %s",
                order_id,
            )

    logger.info("Migration complete")
    logger.info("Migrated: %s", migrated_count)
    logger.info("Skipped: %s", skipped_count)
    logger.info("Failed: %s", failed_count)

    if failed_count:
        raise RuntimeError(
            f"{failed_count} order(s) failed to migrate"
        )


def parse_arguments():
    parser = argparse.ArgumentParser(
        description=(
            "Migrate orders from the original table "
            "to the multi-tenant Orders v2 table."
        )
    )

    parser.add_argument(
        "--source-table",
        default=DEFAULT_SOURCE_TABLE,
    )

    parser.add_argument(
        "--destination-table",
        default=DEFAULT_DESTINATION_TABLE,
    )

    parser.add_argument(
        "--company-id",
        default=DEFAULT_COMPANY_ID,
    )

    parser.add_argument(
        "--region",
        default=DEFAULT_REGION,
    )

    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_arguments()

    migrate_orders(
        source_table_name=arguments.source_table,
        destination_table_name=arguments.destination_table,
        company_id=arguments.company_id,
        region=arguments.region,
    )
