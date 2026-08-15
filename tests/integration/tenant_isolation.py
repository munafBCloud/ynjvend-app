#!/usr/bin/env python3

import argparse
import atexit
import base64
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request


def fail(message):
    print(f"[FAIL] {message}")
    sys.exit(1)


def ok(message):
    print(f"[PASS] {message}")


def request(method, url, token, body=None):
    data = None

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else {}
            return response.status, payload

    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8")

        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}

        return error.code, payload


def expect_status(actual, expected, label, payload):
    if actual != expected:
        print(json.dumps(payload, indent=2))
        fail(
            f"{label}: expected HTTP {expected}, got {actual}"
        )

    ok(f"{label} returned HTTP {actual}")


def decode_company_id(token):
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)

    claims = json.loads(
        base64.urlsafe_b64decode(payload).decode()
    )

    return claims.get("custom:companyId", "")


class Cleanup:
    def __init__(
        self,
        region,
        inventory_table,
        customers_table,
        orders_table,
    ):
        self.region = region
        self.inventory_table = inventory_table
        self.customers_table = customers_table
        self.orders_table = orders_table

        self.records = []

    def add(self, table, company_id, key_name, key_value):
        self.records.append(
            (
                table,
                company_id,
                key_name,
                key_value,
            )
        )

    def delete(self, table, company_id, key_name, key_value):
        key = json.dumps(
            {
                "companyId": {"S": company_id},
                key_name: {"S": key_value},
            }
        )

        result = subprocess.run(
            [
                "aws",
                "dynamodb",
                "delete-item",
                "--region",
                self.region,
                "--table-name",
                table,
                "--key",
                key,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        if result.returncode != 0:
            print(
                "[CLEANUP-WARN] "
                f"{table}/{key_value}: "
                f"{result.stderr.strip()}"
            )
        else:
            print(
                f"[CLEANUP] Deleted "
                f"{table}/{company_id}/{key_value}"
            )

    def run(self):
        if not self.records:
            return

        print()
        print("==========================================")
        print("TENANT ISOLATION CLEANUP")
        print("==========================================")

        for record in reversed(self.records):
            self.delete(*record)

        print("==========================================")
        print("TENANT ISOLATION CLEANUP COMPLETE")
        print("==========================================")


def contains_id(items, field, target):
    return any(
        item.get(field) == target
        for item in items
        if isinstance(item, dict)
    )


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument("--api", required=True)
    parser.add_argument("--token-a", required=True)
    parser.add_argument("--token-b", required=True)

    parser.add_argument("--region", required=True)

    parser.add_argument("--inventory-table", required=True)
    parser.add_argument("--customers-table", required=True)
    parser.add_argument("--orders-table", required=True)

    args = parser.parse_args()

    api = args.api.rstrip("/")

    company_a = decode_company_id(args.token_a)
    company_b = decode_company_id(args.token_b)

    if company_a != "company-ynj-001":
        fail(
            f"Unexpected Tenant A companyId: {company_a}"
        )

    if company_b != "company-regression-002":
        fail(
            f"Unexpected Tenant B companyId: {company_b}"
        )

    if company_a == company_b:
        fail("Tenant A and Tenant B resolve to same company")

    for table in [
        args.inventory_table,
        args.customers_table,
        args.orders_table,
    ]:
        if not table.startswith("ynj-dev-"):
            fail(
                f"Non-DEV table detected: {table}"
            )

    cleanup = Cleanup(
        args.region,
        args.inventory_table,
        args.customers_table,
        args.orders_table,
    )

    atexit.register(cleanup.run)

    unique = f"tenanttest-{int(time.time())}"

    product_a = f"{unique}-product-a"
    product_b = f"{unique}-product-b"

    print()
    print("==========================================")
    print("DISTRODEX TENANT ISOLATION REGRESSION TEST")
    print("==========================================")
    print(f"Tenant A: {company_a}")
    print(f"Tenant B: {company_b}")
    print(f"Test ID : {unique}")
    print()

    # ---------------------------------------------------------
    # Create inventory for Tenant A
    # ---------------------------------------------------------

    status, payload = request(
        "POST",
        f"{api}/inventory",
        args.token_a,
        {
            "productId": product_a,
            "productName": "Tenant A Security Product",
            "brand": "Regression",
            "caseCost": "5.00",
            "sellingPrice": "10.00",
            "quantityInStock": 25,
            "reorderLevel": 5,
            "status": "active",
        },
    )

    expect_status(
        status,
        201,
        "Tenant A create inventory",
        payload,
    )

    cleanup.add(
        args.inventory_table,
        company_a,
        "productId",
        product_a,
    )

    # ---------------------------------------------------------
    # Create inventory for Tenant B
    # ---------------------------------------------------------

    status, payload = request(
        "POST",
        f"{api}/inventory",
        args.token_b,
        {
            "productId": product_b,
            "productName": "Tenant B Security Product",
            "brand": "Regression",
            "caseCost": "6.00",
            "sellingPrice": "12.00",
            "quantityInStock": 30,
            "reorderLevel": 5,
            "status": "active",
        },
    )

    expect_status(
        status,
        201,
        "Tenant B create inventory",
        payload,
    )

    cleanup.add(
        args.inventory_table,
        company_b,
        "productId",
        product_b,
    )

    # ---------------------------------------------------------
    # Collection isolation - inventory
    # ---------------------------------------------------------

    status, payload = request(
        "GET",
        f"{api}/inventory",
        args.token_a,
    )

    expect_status(
        status,
        200,
        "Tenant A read inventory",
        payload,
    )

    items_a = payload.get("items", [])

    if not contains_id(
        items_a,
        "productId",
        product_a,
    ):
        fail(
            "Tenant A cannot see its own inventory product"
        )

    if contains_id(
        items_a,
        "productId",
        product_b,
    ):
        fail(
            "SECURITY FAILURE: Tenant A can see "
            "Tenant B inventory"
        )

    ok("Tenant A inventory collection excludes Tenant B")

    status, payload = request(
        "GET",
        f"{api}/inventory",
        args.token_b,
    )

    expect_status(
        status,
        200,
        "Tenant B read inventory",
        payload,
    )

    items_b = payload.get("items", [])

    if not contains_id(
        items_b,
        "productId",
        product_b,
    ):
        fail(
            "Tenant B cannot see its own inventory product"
        )

    if contains_id(
        items_b,
        "productId",
        product_a,
    ):
        fail(
            "SECURITY FAILURE: Tenant B can see "
            "Tenant A inventory"
        )

    ok("Tenant B inventory collection excludes Tenant A")

    # ---------------------------------------------------------
    # Cross-tenant inventory modification
    # Tenant A attempts to update Product B.
    # ---------------------------------------------------------

    status, payload = request(
        "PUT",
        f"{api}/inventory",
        args.token_a,
        {
            "productId": product_b,
            "productName": "ATTACKED PRODUCT",
            "brand": "ATTACK",
            "caseCost": "0.01",
            "sellingPrice": "0.01",
            "quantityInStock": 999,
            "reorderLevel": 0,
            "status": "active",
        },
    )

    if status not in (404, 409):
        print(json.dumps(payload, indent=2))
        fail(
            "Cross-tenant inventory update was not rejected "
            f"safely; HTTP {status}"
        )

    ok(
        f"Tenant A cannot update Tenant B inventory "
        f"(HTTP {status})"
    )

    # Verify Tenant B object remains unchanged.
    status, payload = request(
        "GET",
        f"{api}/inventory",
        args.token_b,
    )

    expect_status(
        status,
        200,
        "Tenant B verify inventory after attack",
        payload,
    )

    items_b = payload.get("items", [])

    b_product = next(
        (
            item
            for item in items_b
            if item.get("productId") == product_b
        ),
        None,
    )

    if not b_product:
        fail("Tenant B product disappeared after attack")

    if b_product.get("productName") != "Tenant B Security Product":
        fail(
            "SECURITY FAILURE: Tenant B product was modified "
            "by Tenant A"
        )

    if int(b_product.get("quantityInStock")) != 30:
        fail(
            "SECURITY FAILURE: Tenant B inventory quantity "
            "was modified by Tenant A"
        )

    ok("Tenant B inventory remained unchanged")

    # ---------------------------------------------------------
    # Create customers for both tenants
    # ---------------------------------------------------------

    status, payload = request(
        "POST",
        f"{api}/customers",
        args.token_a,
        {
            "businessName": f"Tenant A Store {unique}",
            "contactName": "Tenant A Tester",
            "phone": "555-1001",
            "locationAddress": "100 Tenant A Street",
        },
    )

    expect_status(
        status,
        201,
        "Tenant A create customer",
        payload,
    )

    customer_a = (
        payload
        .get("customer", {})
        .get("customerId")
    )

    if not customer_a:
        fail("Tenant A customerId missing")

    cleanup.add(
        args.customers_table,
        company_a,
        "customerId",
        customer_a,
    )

    status, payload = request(
        "POST",
        f"{api}/customers",
        args.token_b,
        {
            "businessName": f"Tenant B Store {unique}",
            "contactName": "Tenant B Tester",
            "phone": "555-2002",
            "locationAddress": "200 Tenant B Street",
        },
    )

    expect_status(
        status,
        201,
        "Tenant B create customer",
        payload,
    )

    customer_b = (
        payload
        .get("customer", {})
        .get("customerId")
    )

    if not customer_b:
        fail("Tenant B customerId missing")

    cleanup.add(
        args.customers_table,
        company_b,
        "customerId",
        customer_b,
    )

    # ---------------------------------------------------------
    # Customer collection isolation
    # ---------------------------------------------------------

    status, payload = request(
        "GET",
        f"{api}/customers",
        args.token_a,
    )

    expect_status(
        status,
        200,
        "Tenant A read customers",
        payload,
    )

    customers_a = payload.get("customers", [])

    if not contains_id(
        customers_a,
        "customerId",
        customer_a,
    ):
        fail("Tenant A cannot see its own customer")

    if contains_id(
        customers_a,
        "customerId",
        customer_b,
    ):
        fail(
            "SECURITY FAILURE: Tenant A can see "
            "Tenant B customer"
        )

    ok("Tenant A customer collection excludes Tenant B")

    status, payload = request(
        "GET",
        f"{api}/customers",
        args.token_b,
    )

    expect_status(
        status,
        200,
        "Tenant B read customers",
        payload,
    )

    customers_b = payload.get("customers", [])

    if not contains_id(
        customers_b,
        "customerId",
        customer_b,
    ):
        fail("Tenant B cannot see its own customer")

    if contains_id(
        customers_b,
        "customerId",
        customer_a,
    ):
        fail(
            "SECURITY FAILURE: Tenant B can see "
            "Tenant A customer"
        )

    ok("Tenant B customer collection excludes Tenant A")

    # ---------------------------------------------------------
    # Tenant A tries to create order using Tenant B customer.
    # Must fail because customer lookup is tenant-scoped.
    # ---------------------------------------------------------

    status, payload = request(
        "POST",
        f"{api}/orders",
        args.token_a,
        {
            "customerId": customer_b,
            "items": [
                {
                    "productId": product_a,
                    "quantity": 1,
                }
            ],
        },
    )

    expect_status(
        status,
        404,
        "Reject Tenant A order using Tenant B customer",
        payload,
    )

    ok("Cross-tenant customer reference blocked")

    # ---------------------------------------------------------
    # Tenant A tries to order Tenant B product.
    # ---------------------------------------------------------

    status, payload = request(
        "POST",
        f"{api}/orders",
        args.token_a,
        {
            "customerId": customer_a,
            "items": [
                {
                    "productId": product_b,
                    "quantity": 1,
                }
            ],
        },
    )

    expect_status(
        status,
        404,
        "Reject Tenant A order using Tenant B product",
        payload,
    )

    ok("Cross-tenant product reference blocked")

    # ---------------------------------------------------------
    # Create real Tenant B order
    # ---------------------------------------------------------

    status, payload = request(
        "POST",
        f"{api}/orders",
        args.token_b,
        {
            "customerId": customer_b,
            "items": [
                {
                    "productId": product_b,
                    "quantity": 2,
                }
            ],
            "notes": "Tenant B isolation order",
        },
    )

    expect_status(
        status,
        201,
        "Tenant B create order",
        payload,
    )

    order_b = (
        payload
        .get("order", {})
        .get("orderId")
    )

    if not order_b:
        fail("Tenant B orderId missing")

    cleanup.add(
        args.orders_table,
        company_b,
        "orderId",
        order_b,
    )

    # ---------------------------------------------------------
    # Tenant A attempts to modify Tenant B order
    # ---------------------------------------------------------

    status, payload = request(
        "PUT",
        f"{api}/orders/{order_b}",
        args.token_a,
        {
            "status": "Preparing",
        },
    )

    expect_status(
        status,
        404,
        "Reject Tenant A update of Tenant B order",
        payload,
    )

    ok("Cross-tenant order modification blocked")

    # ---------------------------------------------------------
    # Verify Tenant B order still New
    # ---------------------------------------------------------

    status, payload = request(
        "GET",
        f"{api}/orders",
        args.token_b,
    )

    expect_status(
        status,
        200,
        "Tenant B read orders",
        payload,
    )

    orders_b = payload.get("orders", [])

    b_order = next(
        (
            item
            for item in orders_b
            if item.get("orderId") == order_b
        ),
        None,
    )

    if not b_order:
        fail("Tenant B order missing")

    if b_order.get("status") != "New":
        fail(
            "SECURITY FAILURE: Tenant B order changed "
            "during Tenant A attack"
        )

    ok("Tenant B order remained unchanged")

    # ---------------------------------------------------------
    # Tenant A must not see Tenant B order in GET /orders
    # ---------------------------------------------------------

    status, payload = request(
        "GET",
        f"{api}/orders",
        args.token_a,
    )

    expect_status(
        status,
        200,
        "Tenant A read orders",
        payload,
    )

    orders_a = payload.get("orders", [])

    if contains_id(
        orders_a,
        "orderId",
        order_b,
    ):
        fail(
            "SECURITY FAILURE: Tenant A can see "
            "Tenant B order"
        )

    ok("Tenant A order collection excludes Tenant B")

    # ---------------------------------------------------------
    # Tenant A attempts to invoice Tenant B order.
    # Tenant-scoped lookup should make it appear nonexistent.
    # ---------------------------------------------------------

    status, payload = request(
        "POST",
        f"{api}/invoices",
        args.token_a,
        {
            "orderId": order_b,
            "issueDate": "2026-08-15",
            "dueDate": "2026-08-30",
            "notes": "Cross-tenant attack",
        },
    )

    expect_status(
        status,
        404,
        "Reject Tenant A invoice of Tenant B order",
        payload,
    )

    ok("Cross-tenant invoice creation blocked")

    print()
    print("==========================================")
    print("ALL TENANT ISOLATION TESTS PASSED")
    print("==========================================")


if __name__ == "__main__":
    main()
