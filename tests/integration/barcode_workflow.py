import argparse
import json
import sys
import urllib.error
import urllib.parse
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


def lookup(api, token, barcode):
    encoded = urllib.parse.quote(
        barcode,
        safe="",
    )

    return request(
        "GET",
        f"{api}/inventory/barcode/{encoded}",
        token,
    )


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument("--api", required=True)
    parser.add_argument("--token-a", required=True)
    parser.add_argument("--token-b", required=True)
    parser.add_argument("--region", required=True)
    parser.add_argument("--inventory-table", required=True)
    parser.add_argument("--barcode-table", required=True)

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

    suffix = uuid.uuid4().hex[:8]

    product_a = f"barcode-test-a-{suffix}"
    duplicate_product = f"barcode-test-dup-{suffix}"
    product_b = f"barcode-test-b-{suffix}"

    barcode_one = f"91{suffix[:8]}01"
    barcode_two = f"92{suffix[:8]}02"

    # Ensure UPC-A is exactly 12 numeric characters.
    barcode_one = "".join(
        str(ord(char) % 10)
        for char in barcode_one
    )[:12].ljust(12, "1")

    barcode_two = "".join(
        str((ord(char) + 3) % 10)
        for char in barcode_two
    )[:12].ljust(12, "2")

    cleanup_items = [
        ("a", product_a),
        ("a", duplicate_product),
        ("b", product_b),
    ]

    try:
        print()
        print("==========================================")
        print("DISTRODEX BARCODE REGRESSION")
        print("==========================================")
        print()

        # -------------------------------------------------
        # Validation
        # -------------------------------------------------

        status, _ = request(
            "POST",
            f"{api}/inventory",
            args.token_a,
            {
                "productId": f"invalid-short-{suffix}",
                "productName": "Invalid Barcode Product",
                "barcode": "12345",
                "barcodeType": "UPC-A",
            },
        )

        expect_status(
            "Reject short UPC-A",
            status,
            400,
        )

        status, _ = request(
            "POST",
            f"{api}/inventory",
            args.token_a,
            {
                "productId": f"missing-type-{suffix}",
                "productName": "Missing Type Product",
                "barcode": barcode_one,
            },
        )

        expect_status(
            "Reject barcode without barcodeType",
            status,
            400,
        )

        status, _ = request(
            "POST",
            f"{api}/inventory",
            args.token_a,
            {
                "productId": f"missing-barcode-{suffix}",
                "productName": "Missing Barcode Product",
                "barcodeType": "UPC-A",
            },
        )

        expect_status(
            "Reject barcodeType without barcode",
            status,
            400,
        )

        # -------------------------------------------------
        # Create Tenant A product
        # -------------------------------------------------

        status, body = request(
            "POST",
            f"{api}/inventory",
            args.token_a,
            {
                "productId": product_a,
                "productName": "Barcode Regression Product A",
                "brand": "DistroDex Test",
                "caseCost": 10,
                "sellingPrice": 15,
                "quantityInStock": 25,
                "reorderLevel": 5,
                "barcode": barcode_one,
                "barcodeType": "UPC-A",
            },
        )

        expect_status(
            "Create Tenant A barcode product",
            status,
            201,
        )

        created_item = body.get("item", {})

        expect(
            created_item.get("productId") == product_a,
            "Created productId does not match",
        )

        expect(
            created_item.get("barcode") == barcode_one,
            "Created barcode does not match",
        )

        print("[PASS] Created product contains barcode metadata")

        # -------------------------------------------------
        # Lookup
        # -------------------------------------------------

        status, body = lookup(
            api,
            args.token_a,
            barcode_one,
        )

        expect_status(
            "Lookup Tenant A barcode",
            status,
            200,
        )

        lookup_item = body.get("item", {})

        expect(
            lookup_item.get("productId") == product_a,
            "Barcode lookup returned wrong product",
        )

        print("[PASS] Barcode resolves to correct product")

        # -------------------------------------------------
        # Duplicate same-tenant claim
        # -------------------------------------------------

        status, _ = request(
            "POST",
            f"{api}/inventory",
            args.token_a,
            {
                "productId": duplicate_product,
                "productName": "Duplicate Barcode Product",
                "quantityInStock": 1,
                "barcode": barcode_one,
                "barcodeType": "UPC-A",
            },
        )

        expect_status(
            "Reject duplicate barcode in same tenant",
            status,
            409,
        )

        ghost = inventory_table.get_item(
            Key={
                "companyId": "company-ynj-001",
                "productId": duplicate_product,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            ghost is None,
            "Duplicate transaction created ghost inventory item",
        )

        print("[PASS] Failed duplicate transaction created no ghost item")

        status, body = lookup(
            api,
            args.token_a,
            barcode_one,
        )

        expect_status(
            "Original barcode survives duplicate attempt",
            status,
            200,
        )

        expect(
            body.get("item", {}).get("productId") == product_a,
            "Original barcode ownership changed unexpectedly",
        )

        print("[PASS] Original barcode ownership preserved")

        # -------------------------------------------------
        # Barcode change
        # -------------------------------------------------

        status, body = request(
            "PUT",
            f"{api}/inventory",
            args.token_a,
            {
                "productId": product_a,
                "barcode": barcode_two,
                "barcodeType": "UPC-A",
            },
        )

        expect_status(
            "Change Tenant A barcode",
            status,
            200,
        )

        expect(
            body.get("item", {}).get("barcode") == barcode_two,
            "Updated product does not contain new barcode",
        )

        status, _ = lookup(
            api,
            args.token_a,
            barcode_one,
        )

        expect_status(
            "Old barcode removed",
            status,
            404,
        )

        status, body = lookup(
            api,
            args.token_a,
            barcode_two,
        )

        expect_status(
            "New barcode resolves",
            status,
            200,
        )

        expect(
            body.get("item", {}).get("productId") == product_a,
            "New barcode resolves to wrong product",
        )

        print("[PASS] Barcode reassignment is consistent")

        # -------------------------------------------------
        # Tenant B may use same barcode
        # -------------------------------------------------

        status, body = request(
            "POST",
            f"{api}/inventory",
            args.token_b,
            {
                "productId": product_b,
                "productName": "Barcode Regression Product B",
                "quantityInStock": 10,
                "barcode": barcode_two,
                "barcodeType": "UPC-A",
            },
        )

        expect_status(
            "Tenant B may reuse manufacturer barcode",
            status,
            201,
        )

        status, body = lookup(
            api,
            args.token_b,
            barcode_two,
        )

        expect_status(
            "Tenant B barcode lookup",
            status,
            200,
        )

        expect(
            body.get("item", {}).get("productId") == product_b,
            "Tenant B lookup returned wrong product",
        )

        status, body = lookup(
            api,
            args.token_a,
            barcode_two,
        )

        expect_status(
            "Tenant A lookup remains isolated",
            status,
            200,
        )

        expect(
            body.get("item", {}).get("productId") == product_a,
            "Tenant A barcode mapping was affected by Tenant B",
        )

        print("[PASS] Barcode registry is tenant isolated")

        # -------------------------------------------------
        # Barcode removal
        # -------------------------------------------------

        status, body = request(
            "PUT",
            f"{api}/inventory",
            args.token_a,
            {
                "productId": product_a,
                "barcode": "",
                "barcodeType": "",
            },
        )

        expect_status(
            "Remove barcode from Tenant A product",
            status,
            200,
        )

        item = body.get("item", {})

        expect(
            "barcode" not in item,
            "barcode attribute still exists after removal",
        )

        expect(
            "barcodeType" not in item,
            "barcodeType attribute still exists after removal",
        )

        status, _ = lookup(
            api,
            args.token_a,
            barcode_two,
        )

        expect_status(
            "Removed barcode no longer resolves for Tenant A",
            status,
            404,
        )

        # Tenant B must remain unaffected.
        status, body = lookup(
            api,
            args.token_b,
            barcode_two,
        )

        expect_status(
            "Tenant B mapping survives Tenant A removal",
            status,
            200,
        )

        expect(
            body.get("item", {}).get("productId") == product_b,
            "Tenant B registry mapping was unexpectedly changed",
        )

        print("[PASS] Cross-tenant registry independence preserved")

        print()
        print("==========================================")
        print("ALL BARCODE REGRESSION TESTS PASSED")
        print("==========================================")
        print()

    finally:
        # Cleanup is intentionally direct against DEV DynamoDB so
        # failed tests do not leave regression fixtures behind.

        company_ids = {
            "a": "company-ynj-001",
            "b": "company-regression-002",
        }

        for tenant, product_id in cleanup_items:
            company_id = company_ids[tenant]

            try:
                existing = inventory_table.get_item(
                    Key={
                        "companyId": company_id,
                        "productId": product_id,
                    },
                    ConsistentRead=True,
                ).get("Item")

                if existing:
                    barcode = existing.get("barcode")

                    inventory_table.delete_item(
                        Key={
                            "companyId": company_id,
                            "productId": product_id,
                        }
                    )

                    if barcode:
                        barcode_table.delete_item(
                            Key={
                                "companyId": company_id,
                                "barcode": barcode,
                            }
                        )

            except Exception as error:
                print(
                    f"[WARN] Cleanup failed for {product_id}: {error}",
                    file=sys.stderr,
                )


if __name__ == "__main__":
    main()
