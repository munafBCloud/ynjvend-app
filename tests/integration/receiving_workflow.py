import argparse
import json
import sys
import urllib.error
import urllib.request
import uuid

import boto3


def request(method, url, token, body=None):
    data = None

    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req) as response:
            raw = response.read().decode("utf-8")

            return (
                response.status,
                json.loads(raw) if raw else {},
            )

    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8")

        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            body = {"raw": raw}

        return error.code, body


def expect_status(name, actual, expected):
    if actual != expected:
        raise AssertionError(
            f"{name}: expected HTTP {expected}, got {actual}"
        )

    print(f"[PASS] {name}")


def expect(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument("--api", required=True)
    parser.add_argument("--token-a", required=True)
    parser.add_argument("--token-b", required=True)
    parser.add_argument("--region", required=True)
    parser.add_argument("--inventory-table", required=True)
    parser.add_argument("--barcode-table", required=True)
    parser.add_argument("--receipts-table", required=True)

    args = parser.parse_args()

    api = args.api.rstrip("/")

    dynamodb = boto3.resource(
        "dynamodb",
        region_name=args.region,
    )

    inventory_table = dynamodb.Table(
        args.inventory_table
    )

    barcode_table = dynamodb.Table(
        args.barcode_table
    )

    receipts_table = dynamodb.Table(
        args.receipts_table
    )

    suffix = uuid.uuid4().hex[:8]

    product_a = f"receiving-test-a-{suffix}"
    product_b = f"receiving-test-b-{suffix}"

    barcode = "".join(
        str(ord(char) % 10)
        for char in f"93{suffix}01"
    )[:12].ljust(12, "3")

    company_a = "company-ynj-001"
    company_b = "company-regression-002"

    receipt_ids = []

    try:
        print()
        print("==========================================")
        print("DISTRODEX RECEIVING REGRESSION")
        print("==========================================")
        print()

        # -------------------------------------------------
        # Create Tenant A inventory product
        # -------------------------------------------------

        status, body = request(
            "POST",
            f"{api}/inventory",
            args.token_a,
            {
                "productId": product_a,
                "productName": "Receiving Regression Product A",
                "brand": "DistroDex Test",
                "caseCost": 10,
                "sellingPrice": 15,
                "quantityInStock": 10,
                "reorderLevel": 2,
                "barcode": barcode,
                "barcodeType": "UPC-A",
            },
        )

        expect_status(
            "Create receiving test product",
            status,
            201,
        )

        # -------------------------------------------------
        # Validation
        # -------------------------------------------------

        invalid_cases = [
            (
                "Reject zero receive quantity",
                {
                    "barcode": barcode,
                    "quantityReceived": 0,
                },
            ),
            (
                "Reject negative receive quantity",
                {
                    "barcode": barcode,
                    "quantityReceived": -5,
                },
            ),
            (
                "Reject fractional receive quantity",
                {
                    "barcode": barcode,
                    "quantityReceived": 1.5,
                },
            ),
            (
                "Reject unexpected receiving field",
                {
                    "barcode": barcode,
                    "quantityReceived": 2,
                    "companyId": company_b,
                },
            ),
        ]

        for name, payload in invalid_cases:
            status, _ = request(
                "POST",
                f"{api}/inventory/receive",
                args.token_a,
                payload,
            )

            expect_status(
                name,
                status,
                400,
            )

        status, _ = request(
            "POST",
            f"{api}/inventory/receive",
            args.token_a,
            {
                "barcode": "999999999999",
                "quantityReceived": 2,
            },
        )

        expect_status(
            "Reject unknown barcode",
            status,
            404,
        )

        # Failed requests must not mutate inventory.
        current = inventory_table.get_item(
            Key={
                "companyId": company_a,
                "productId": product_a,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            current is not None,
            "Receiving fixture disappeared",
        )

        expect(
            int(current["quantityInStock"]) == 10,
            "Invalid receiving request changed inventory quantity",
        )

        print("[PASS] Invalid receives leave inventory unchanged")

        # -------------------------------------------------
        # Successful receiving
        # -------------------------------------------------

        status, body = request(
            "POST",
            f"{api}/inventory/receive",
            args.token_a,
            {
                "barcode": barcode,
                "quantityReceived": 7,
            },
        )

        expect_status(
            "Receive inventory successfully",
            status,
            201,
        )

        item = body.get("item", {})
        receipt = body.get("receipt", {})

        expect(
            item.get("productId") == product_a,
            "Receiving returned wrong inventory product",
        )

        expect(
            int(item.get("quantityInStock", -1)) == 17,
            "Receiving did not increment inventory correctly",
        )

        expect(
            receipt.get("productId") == product_a,
            "Receipt has wrong productId",
        )

        expect(
            receipt.get("barcode") == barcode,
            "Receipt has wrong barcode",
        )

        expect(
            int(receipt.get("quantityReceived", -1)) == 7,
            "Receipt has wrong quantityReceived",
        )

        expect(
            int(receipt.get("previousQuantity", -1)) == 10,
            "Receipt has wrong previousQuantity",
        )

        expect(
            int(receipt.get("newQuantity", -1)) == 17,
            "Receipt has wrong newQuantity",
        )

        expect(
            receipt.get("type") == "RECEIVING",
            "Receipt type is not RECEIVING",
        )

        expect(
            bool(str(receipt.get("receivedBy", "")).strip()),
            "Receipt receivedBy was not populated",
        )

        receipt_id = str(
            receipt.get("receiptId", "")
        ).strip()

        expect(
            receipt_id.startswith("rcv-"),
            "Receipt ID is missing or malformed",
        )

        receipt_ids.append(receipt_id)

        print("[PASS] Receipt response fields are correct")

        # -------------------------------------------------
        # Verify persisted inventory
        # -------------------------------------------------

        persisted_inventory = inventory_table.get_item(
            Key={
                "companyId": company_a,
                "productId": product_a,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            persisted_inventory is not None,
            "Updated inventory item was not persisted",
        )

        expect(
            int(persisted_inventory["quantityInStock"]) == 17,
            "Persisted inventory quantity is incorrect",
        )

        print("[PASS] Inventory increment persisted")

        # -------------------------------------------------
        # Verify persisted receipt
        # -------------------------------------------------

        persisted_receipt = receipts_table.get_item(
            Key={
                "companyId": company_a,
                "receiptId": receipt_id,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            persisted_receipt is not None,
            "Receiving receipt was not persisted",
        )

        expect(
            persisted_receipt.get("productId") == product_a,
            "Persisted receipt productId is incorrect",
        )

        expect(
            int(persisted_receipt["previousQuantity"]) == 10,
            "Persisted previousQuantity is incorrect",
        )

        expect(
            int(persisted_receipt["newQuantity"]) == 17,
            "Persisted newQuantity is incorrect",
        )

        expect(
            bool(str(
                persisted_receipt.get("receivedBy", "")
            ).strip()),
            "Persisted receivedBy is empty",
        )

        print("[PASS] Immutable receiving receipt persisted")

        # -------------------------------------------------
        # Tenant isolation
        # -------------------------------------------------

        status, _ = request(
            "POST",
            f"{api}/inventory/receive",
            args.token_b,
            {
                "barcode": barcode,
                "quantityReceived": 5,
            },
        )

        expect_status(
            "Tenant B cannot receive Tenant A barcode",
            status,
            404,
        )

        after_tenant_b_attempt = inventory_table.get_item(
            Key={
                "companyId": company_a,
                "productId": product_a,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            int(
                after_tenant_b_attempt["quantityInStock"]
            ) == 17,
            "Cross-tenant receiving changed Tenant A inventory",
        )

        print("[PASS] Receiving workflow is tenant isolated")

        # -------------------------------------------------
        # Same barcode may exist independently in Tenant B
        # -------------------------------------------------

        status, _ = request(
            "POST",
            f"{api}/inventory",
            args.token_b,
            {
                "productId": product_b,
                "productName": "Receiving Regression Product B",
                "quantityInStock": 20,
                "barcode": barcode,
                "barcodeType": "UPC-A",
            },
        )

        expect_status(
            "Create Tenant B same-barcode product",
            status,
            201,
        )

        status, body = request(
            "POST",
            f"{api}/inventory/receive",
            args.token_b,
            {
                "barcode": barcode,
                "quantityReceived": 4,
            },
        )

        expect_status(
            "Tenant B receives its own barcode",
            status,
            201,
        )

        tenant_b_receipt = body.get("receipt", {})

        tenant_b_receipt_id = str(
            tenant_b_receipt.get("receiptId", "")
        ).strip()

        if tenant_b_receipt_id:
            receipt_ids.append(
                (company_b, tenant_b_receipt_id)
            )

        expect(
            int(
                body.get("item", {}).get(
                    "quantityInStock",
                    -1,
                )
            ) == 24,
            "Tenant B inventory did not increment correctly",
        )

        # Tenant A must remain unchanged.
        tenant_a_final = inventory_table.get_item(
            Key={
                "companyId": company_a,
                "productId": product_a,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            int(tenant_a_final["quantityInStock"]) == 17,
            "Tenant B receive affected Tenant A inventory",
        )

        print("[PASS] Same barcode remains independently tenant scoped")

        print()
        print("==========================================")
        print("ALL RECEIVING REGRESSION TESTS PASSED")
        print("==========================================")
        print()

    finally:
        # -------------------------------------------------
        # Cleanup regression fixtures directly in DEV
        # -------------------------------------------------

        cleanup_products = [
            (company_a, product_a),
            (company_b, product_b),
        ]

        for company_id, product_id in cleanup_products:
            try:
                existing = inventory_table.get_item(
                    Key={
                        "companyId": company_id,
                        "productId": product_id,
                    },
                    ConsistentRead=True,
                ).get("Item")

                if existing:
                    item_barcode = existing.get("barcode")

                    inventory_table.delete_item(
                        Key={
                            "companyId": company_id,
                            "productId": product_id,
                        }
                    )

                    if item_barcode:
                        barcode_table.delete_item(
                            Key={
                                "companyId": company_id,
                                "barcode": item_barcode,
                            }
                        )

            except Exception as error:
                print(
                    f"[WARN] Product cleanup failed: {error}",
                    file=sys.stderr,
                )

        normalized_receipts = []

        for item in receipt_ids:
            if isinstance(item, tuple):
                normalized_receipts.append(item)
            else:
                normalized_receipts.append(
                    (company_a, item)
                )

        for company_id, receipt_id in normalized_receipts:
            try:
                receipts_table.delete_item(
                    Key={
                        "companyId": company_id,
                        "receiptId": receipt_id,
                    }
                )

            except Exception as error:
                print(
                    f"[WARN] Receipt cleanup failed: {error}",
                    file=sys.stderr,
                )


if __name__ == "__main__":
    main()
