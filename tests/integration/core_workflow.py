#!/usr/bin/env python3

import argparse
import atexit
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal


def fail(message):
    print(f"[FAIL] {message}")
    sys.exit(1)


def ok(message):
    print(f"[PASS] {message}")


def request(
    method,
    url,
    token,
    body=None,
    idempotency_key=None,
):
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    if method == "POST" and url.rstrip("/").endswith("/orders"):
        if idempotency_key is not False:
            headers["Idempotency-Key"] = (
                str(uuid.uuid4())
                if idempotency_key is None
                else str(idempotency_key)
            )

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
        fail(f"{label}: expected HTTP {expected}, got {actual}")

    ok(f"{label} returned HTTP {actual}")


def find_inventory_item(items, product_id):
    for item in items:
        if item.get("productId") == product_id:
            return item
    return None


def find_invoice(invoices, invoice_id):
    for invoice in invoices:
        if invoice.get("invoiceId") == invoice_id:
            return invoice
    return None



class DevCleanup:
    def __init__(
        self,
        *,
        api,
        token,
        region,
        inventory_table,
        customers_table,
        orders_table,
        invoices_table,
    ):
        self.api = api.rstrip("/")
        self.token = token
        self.region = region

        self.tables = {
            "inventory": inventory_table,
            "customers": customers_table,
            "orders": orders_table,
            "invoices": invoices_table,
        }

        self.company_id = self._get_company_id()

        self.product_ids = []
        self.customer_ids = []
        self.order_ids = []
        self.invoice_ids = []

        self.enabled = self._validate_dev_guard()

    def _get_company_id(self):
        try:
            payload = self.token.split(".")[1]
            payload += "=" * (-len(payload) % 4)

            claims = json.loads(
                base64.urlsafe_b64decode(payload).decode("utf-8")
            )

            company_id = claims.get("custom:companyId")

            if not isinstance(company_id, str):
                return ""

            return company_id.strip()

        except Exception:
            return ""

    def _validate_dev_guard(self):
        regression_environments = {
            "https://ra280rph8l.execute-api.us-east-1.amazonaws.com": {
                "name": "DEV",
                "table_prefix": "ynj-dev-",
            },
            "https://5jdda1zgjk.execute-api.us-east-1.amazonaws.com": {
                "name": "TEST",
                "table_prefix": "ynj-test-",
            },
        }

        environment = regression_environments.get(self.api)

        if environment is None:
            print(
                "[CLEANUP] Disabled: API is not an approved "
                "regression endpoint."
            )
            return False

        if not self.company_id:
            print(
                "[CLEANUP] Disabled: companyId could not be read from token."
            )
            return False

        expected_prefix = environment["table_prefix"]

        for table_name in self.tables.values():
            if not table_name.startswith(expected_prefix):
                print(
                    "[CLEANUP] Disabled: table does not match "
                    f"{environment['name']} environment: {table_name}"
                )
                return False

        self.environment_name = environment["name"]
        return True

    def track_product(self, product_id):
        if product_id:
            self.product_ids.append(product_id)

    def track_customer(self, customer_id):
        if customer_id:
            self.customer_ids.append(customer_id)

    def track_order(self, order_id):
        if order_id:
            self.order_ids.append(order_id)

    def track_invoice(self, invoice_id):
        if invoice_id:
            self.invoice_ids.append(invoice_id)

    def _delete_item(
        self,
        *,
        table,
        range_key,
        range_value,
    ):
        key = json.dumps(
            {
                "companyId": {
                    "S": self.company_id,
                },
                range_key: {
                    "S": range_value,
                },
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
                f"[CLEANUP-WARN] Could not delete "
                f"{table}/{range_value}: "
                f"{result.stderr.strip()}"
            )
            return

        print(
            f"[CLEANUP] Deleted {table}/{range_value}"
        )

    def run(self):
        if not self.enabled:
            print(
                "[CLEANUP] Automatic cleanup did not run "
                "because regression safety validation failed."
            )
            return

        print()
        print("==========================================")
        environment_name = getattr(self, "environment_name", "UNKNOWN")
        print(f"{environment_name} REGRESSION CLEANUP")
        print("==========================================")

        # Child/business records first.
        for invoice_id in reversed(self.invoice_ids):
            self._delete_item(
                table=self.tables["invoices"],
                range_key="invoiceId",
                range_value=invoice_id,
            )

        for order_id in reversed(self.order_ids):
            self._delete_item(
                table=self.tables["orders"],
                range_key="orderId",
                range_value=order_id,
            )

        for customer_id in reversed(self.customer_ids):
            self._delete_item(
                table=self.tables["customers"],
                range_key="customerId",
                range_value=customer_id,
            )

        for product_id in reversed(self.product_ids):
            self._delete_item(
                table=self.tables["inventory"],
                range_key="productId",
                range_value=product_id,
            )

        print("==========================================")
        print(f"{environment_name} REGRESSION CLEANUP COMPLETE")
        print("==========================================")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--region", required=True)
    parser.add_argument("--inventory-table", required=True)
    parser.add_argument("--customers-table", required=True)
    parser.add_argument("--orders-table", required=True)
    parser.add_argument("--invoices-table", required=True)
    args = parser.parse_args()

    api = args.api.rstrip("/")
    token = args.token

    cleanup = DevCleanup(
        api=api,
        token=token,
        region=args.region,
        inventory_table=args.inventory_table,
        customers_table=args.customers_table,
        orders_table=args.orders_table,
        invoices_table=args.invoices_table,
    )

    atexit.register(cleanup.run)

    if not cleanup.enabled:
        fail(
            "Regression cleanup safety guard failed. "
            "Regression suite will not run."
        )

    unique = f"regtest-{int(time.time())}"

    product_id = f"{unique}-product"
    selling_price = Decimal("7.25")
    initial_quantity = 20
    order_quantity = 3
    expected_total = selling_price * order_quantity

    print()
    print("==========================================")
    environment_name = getattr(cleanup, "environment_name", "UNKNOWN")
    print(
        f"DISTRODEX {environment_name} "
        "CORE WORKFLOW REGRESSION TEST"
    )
    print("==========================================")
    print(f"Test ID: {unique}")
    print()

    # 1. Create inventory
    status, payload = request(
        "POST",
        f"{api}/inventory",
        token,
        {
            "productId": product_id,
            "productName": f"Regression Product {unique}",
            "brand": "DistroDex Test",
            "caseCost": "4.00",
            "sellingPrice": str(selling_price),
            "quantityInStock": initial_quantity,
            "reorderLevel": 5,
            "status": "active",
        },
    )

    expect_status(status, 201, "Create inventory", payload)

    created_product = payload.get("item", {})
    if created_product.get("productId") != product_id:
        fail("Created inventory productId mismatch")

    ok("Inventory product created correctly")
    cleanup.track_product(product_id)

    # 2. Create customer
    status, payload = request(
        "POST",
        f"{api}/customers",
        token,
        {
            "businessName": f"Regression Store {unique}",
            "contactName": "Regression Tester",
            "phone": "555-0100",
            "locationAddress": "100 Test Street",
        },
    )

    expect_status(status, 201, "Create customer", payload)

    customer = payload.get("customer", {})
    customer_id = customer.get("customerId")

    if not customer_id:
        fail("Customer response did not contain customerId")

    ok(f"Customer created: {customer_id}")
    cleanup.track_customer(customer_id)

    # 3. Create order
    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        {
            "customerId": customer_id,
            "items": [
                {
                    "productId": product_id,
                    "quantity": order_quantity,
                }
            ],
            "notes": "Automated regression test",
        },
    )

    expect_status(status, 201, "Create order", payload)

    order = payload.get("order", {})
    order_id = order.get("orderId")

    if not order_id:
        fail("Order response did not contain orderId")

    if order.get("status") != "New":
        fail(f"Expected new order status 'New', got {order.get('status')}")

    ok(f"Order created: {order_id}")
    cleanup.track_order(order_id)

    # 4. Verify server-side pricing
    items = order.get("items", [])

    if len(items) != 1:
        fail("Expected exactly one order item")

    order_item = items[0]

    unit_price = Decimal(str(order_item.get("unitPrice")))
    line_total = Decimal(str(order_item.get("lineTotal")))

    if unit_price != selling_price:
        fail(
            f"Server-side unit price mismatch: "
            f"expected {selling_price}, got {unit_price}"
        )

    if line_total != expected_total:
        fail(
            f"Line total mismatch: "
            f"expected {expected_total}, got {line_total}"
        )

    subtotal = Decimal(str(order.get("subtotal")))
    tax = Decimal(str(order.get("tax")))
    discount = Decimal(str(order.get("discount")))
    order_total = Decimal(str(order.get("total")))

    if subtotal != expected_total:
        fail(
            f"Order subtotal mismatch: "
            f"expected {expected_total}, got {subtotal}"
        )

    if tax != Decimal("0"):
        fail(
            f"Expected regression order tax 0, got {tax}"
        )

    if discount != Decimal("0"):
        fail(
            f"Expected regression order discount 0, got {discount}"
        )

    if order_total != expected_total:
        fail(
            f"Order total mismatch: "
            f"expected {expected_total}, got {order_total}"
        )

    ok("Server-side pricing verified")

    # 5. Move order New -> Preparing
    status, payload = request(
        "PUT",
        f"{api}/orders/{order_id}",
        token,
        {"status": "Preparing"},
    )

    expect_status(status, 200, "Order New -> Preparing", payload)

    updated_order = payload.get("order", payload)

    if updated_order.get("status") != "Preparing":
        fail(
            f"Expected order status Preparing, "
            f"got {updated_order.get('status')}"
        )

    ok("Order transitioned to Preparing")

    # 6. Move Preparing -> Completed
    status, payload = request(
        "PUT",
        f"{api}/orders/{order_id}",
        token,
        {"status": "Completed"},
    )

    expect_status(status, 200, "Order Preparing -> Completed", payload)

    completed_order = payload.get("order", payload)

    if completed_order.get("status") != "Completed":
        fail(
            f"Expected order status Completed, "
            f"got {completed_order.get('status')}"
        )

    ok("Order transitioned to Completed")

    # 7. Verify inventory decrement
    status, payload = request(
        "GET",
        f"{api}/inventory",
        token,
    )

    expect_status(status, 200, "Read inventory", payload)

    inventory_items = payload.get("items", [])
    inventory_product = find_inventory_item(
        inventory_items,
        product_id,
    )

    if not inventory_product:
        fail("Regression inventory product not found after order completion")

    expected_remaining = initial_quantity - order_quantity
    actual_remaining = int(
        inventory_product.get("quantityInStock")
    )

    if actual_remaining != expected_remaining:
        fail(
            f"Inventory decrement mismatch: "
            f"expected {expected_remaining}, "
            f"got {actual_remaining}"
        )

    ok(
        f"Inventory decremented correctly: "
        f"{initial_quantity} -> {actual_remaining}"
    )

    # 8. Create invoice
    status, payload = request(
        "POST",
        f"{api}/invoices",
        token,
        {
            "orderId": order_id,
            "issueDate": "2026-08-15",
            "dueDate": "2026-08-30",
            "notes": "Automated regression invoice",
        },
    )

    expect_status(status, 201, "Create invoice", payload)

    invoice = payload.get("invoice", {})
    invoice_id = invoice.get("invoiceId")

    if not invoice_id:
        fail("Invoice response did not contain invoiceId")

    ok(f"Invoice created: {invoice_id}")
    cleanup.track_invoice(invoice_id)

    # 9. Verify invoice pricing
    invoice_total = invoice.get("total")

    if invoice_total is None:
        invoice_total = invoice.get("invoiceTotal")

    if invoice_total is None:
        invoice_total = invoice.get("orderTotal")

    if invoice_total is None:
        fail(
            "Could not identify invoice total field in response:\n"
            + json.dumps(invoice, indent=2)
        )

    if Decimal(str(invoice_total)) != expected_total:
        fail(
            f"Invoice total mismatch: "
            f"expected {expected_total}, got {invoice_total}"
        )

    ok("Invoice total matches server-calculated order total")

    # 10. GET invoices and verify persistence
    status, payload = request(
        "GET",
        f"{api}/invoices",
        token,
    )

    expect_status(status, 200, "Read invoices", payload)

    invoices = payload.get("invoices", payload.get("items", []))
    persisted_invoice = find_invoice(invoices, invoice_id)

    if not persisted_invoice:
        fail("Created invoice was not returned by GET /invoices")

    ok("Created invoice persisted and is retrievable")


    # ============================================================
    # NEGATIVE / BUSINESS-RULE REGRESSION TESTS
    # ============================================================

    print()
    print("==========================================")
    print("NEGATIVE / BUSINESS-RULE TESTS")
    print("==========================================")

    # 11. Client must not be able to inject pricing
    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        {
            "customerId": customer_id,
            "items": [
                {
                    "productId": product_id,
                    "quantity": 1,
                }
            ],
            "unitPrice": "0.01",
        },
    )

    expect_status(
        status,
        400,
        "Reject client price manipulation",
        payload,
    )

    ok("Client cannot inject order pricing")

    # 12. Nonexistent customer must fail
    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        {
            "customerId": f"{unique}-missing-customer",
            "items": [
                {
                    "productId": product_id,
                    "quantity": 1,
                }
            ],
        },
    )

    expect_status(
        status,
        404,
        "Reject nonexistent customer",
        payload,
    )

    ok("Nonexistent customer rejected")

    # 13. Nonexistent product must fail
    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        {
            "customerId": customer_id,
            "items": [
                {
                    "productId": f"{unique}-missing-product",
                    "quantity": 1,
                }
            ],
        },
    )

    expect_status(
        status,
        404,
        "Reject nonexistent product",
        payload,
    )

    ok("Nonexistent product rejected")

    # 14. Completed order is terminal
    status, payload = request(
        "PUT",
        f"{api}/orders/{order_id}",
        token,
        {"status": "Preparing"},
    )

    expect_status(
        status,
        409,
        "Reject Completed -> Preparing",
        payload,
    )

    ok("Completed order cannot return to Preparing")

    # 15. Duplicate invoice must fail
    status, payload = request(
        "POST",
        f"{api}/invoices",
        token,
        {
            "orderId": order_id,
            "issueDate": "2026-08-15",
            "dueDate": "2026-08-30",
            "notes": "Duplicate regression invoice",
        },
    )

    expect_status(
        status,
        409,
        "Reject duplicate invoice",
        payload,
    )

    ok("Duplicate invoice rejected")

    # 16. Create another order to test invoice-before-completion
    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        {
            "customerId": customer_id,
            "items": [
                {
                    "productId": product_id,
                    "quantity": 1,
                }
            ],
            "notes": "Invoice-before-completion regression test",
        },
    )

    expect_status(
        status,
        201,
        "Create unfinished test order",
        payload,
    )

    unfinished_order = payload.get("order", {})
    unfinished_order_id = unfinished_order.get("orderId")

    if not unfinished_order_id:
        fail("Unfinished test order did not return orderId")

    cleanup.track_order(unfinished_order_id)

    status, payload = request(
        "POST",
        f"{api}/invoices",
        token,
        {
            "orderId": unfinished_order_id,
            "issueDate": "2026-08-15",
            "dueDate": "2026-08-30",
            "notes": "Must not succeed",
        },
    )

    expect_status(
        status,
        409,
        "Reject invoice before completion",
        payload,
    )

    ok("Uncompleted order cannot be invoiced")

    # 17. New -> Completed must be rejected
    status, payload = request(
        "PUT",
        f"{api}/orders/{unfinished_order_id}",
        token,
        {"status": "Completed"},
    )

    expect_status(
        status,
        409,
        "Reject New -> Completed",
        payload,
    )

    ok("Order workflow cannot skip Preparing")

    # 18. Insufficient inventory test
    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        {
            "customerId": customer_id,
            "items": [
                {
                    "productId": product_id,
                    "quantity": 1000,
                }
            ],
            "notes": "Insufficient inventory regression test",
        },
    )

    expect_status(
        status,
        201,
        "Create oversized inventory order",
        payload,
    )

    oversized_order = payload.get("order", {})
    oversized_order_id = oversized_order.get("orderId")

    if not oversized_order_id:
        fail("Oversized test order did not return orderId")

    cleanup.track_order(oversized_order_id)

    # New -> Preparing is valid
    status, payload = request(
        "PUT",
        f"{api}/orders/{oversized_order_id}",
        token,
        {"status": "Preparing"},
    )

    expect_status(
        status,
        200,
        "Oversized order New -> Preparing",
        payload,
    )

    # Capture inventory before failed completion
    status, payload = request(
        "GET",
        f"{api}/inventory",
        token,
    )

    expect_status(
        status,
        200,
        "Read inventory before insufficient-stock test",
        payload,
    )

    before_product = find_inventory_item(
        payload.get("items", []),
        product_id,
    )

    if not before_product:
        fail("Regression product missing before stock test")

    quantity_before_failed_completion = int(
        before_product.get("quantityInStock")
    )

    # Preparing -> Completed must fail
    status, payload = request(
        "PUT",
        f"{api}/orders/{oversized_order_id}",
        token,
        {"status": "Completed"},
    )

    expect_status(
        status,
        409,
        "Reject completion with insufficient inventory",
        payload,
    )

    ok("Insufficient inventory prevents completion")

    # Inventory must remain unchanged after failed completion
    status, payload = request(
        "GET",
        f"{api}/inventory",
        token,
    )

    expect_status(
        status,
        200,
        "Read inventory after failed completion",
        payload,
    )

    after_product = find_inventory_item(
        payload.get("items", []),
        product_id,
    )

    if not after_product:
        fail("Regression product missing after stock test")

    quantity_after_failed_completion = int(
        after_product.get("quantityInStock")
    )

    if (
        quantity_after_failed_completion
        != quantity_before_failed_completion
    ):
        fail(
            "Inventory changed after failed order completion: "
            f"before={quantity_before_failed_completion}, "
            f"after={quantity_after_failed_completion}"
        )

    ok(
        "Failed completion left inventory unchanged "
        f"at {quantity_after_failed_completion}"
    )

    # ============================================================
    # ORDER CREATION IDEMPOTENCY TESTS
    # ============================================================

    print()
    print("==========================================")
    print("ORDER CREATION IDEMPOTENCY TESTS")
    print("==========================================")

    idempotency_body = {
        "customerId": customer_id,
        "items": [
            {
                "productId": product_id,
                "quantity": 1,
            }
        ],
        "notes": "Order idempotency regression test",
    }

    # 19. Missing Idempotency-Key must fail
    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        idempotency_body,
        idempotency_key=False,
    )

    expect_status(
        status,
        400,
        "Reject missing order idempotency key",
        payload,
    )

    # 20. Malformed Idempotency-Key must fail
    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        idempotency_body,
        idempotency_key="not-a-valid-uuid",
    )

    expect_status(
        status,
        400,
        "Reject malformed order idempotency key",
        payload,
    )

    # 21. First request with a valid key creates one order
    order_idempotency_key = str(uuid.uuid4())

    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        idempotency_body,
        idempotency_key=order_idempotency_key,
    )

    expect_status(
        status,
        201,
        "Create idempotent order",
        payload,
    )

    idempotent_order = payload.get("order", {})
    idempotent_order_id = idempotent_order.get("orderId")

    if not idempotent_order_id:
        fail("Idempotent order response did not contain orderId")

    expected_idempotent_order_id = (
        f"ord-{order_idempotency_key}"
    )

    if idempotent_order_id != expected_idempotent_order_id:
        fail(
            "Deterministic orderId mismatch: "
            f"expected {expected_idempotent_order_id}, "
            f"got {idempotent_order_id}"
        )

    cleanup.track_order(idempotent_order_id)

    # 22. Same key + same request must replay original order
    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        idempotency_body,
        idempotency_key=order_idempotency_key,
    )

    expect_status(
        status,
        200,
        "Replay idempotent order",
        payload,
    )

    replay_order = payload.get("order", {})

    if replay_order.get("orderId") != idempotent_order_id:
        fail("Idempotent replay returned a different orderId")

    if payload.get("idempotentReplay") is not True:
        fail("Idempotent replay flag was not true")

    ok("Same idempotency key replayed the original order")

    # 23. Same key + different request must conflict
    conflicting_body = {
        "customerId": customer_id,
        "items": [
            {
                "productId": product_id,
                "quantity": 2,
            }
        ],
        "notes": "Order idempotency regression test",
    }

    status, payload = request(
        "POST",
        f"{api}/orders",
        token,
        conflicting_body,
        idempotency_key=order_idempotency_key,
    )

    expect_status(
        status,
        409,
        "Reject conflicting idempotency-key reuse",
        payload,
    )

    # 24. Verify replay did not persist a duplicate order
    status, payload = request(
        "GET",
        f"{api}/orders",
        token,
    )

    expect_status(
        status,
        200,
        "Read orders after idempotency replay",
        payload,
    )

    persisted_orders = payload.get(
        "orders",
        payload.get("items", []),
    )

    matching_orders = [
        item
        for item in persisted_orders
        if item.get("orderId") == idempotent_order_id
    ]

    if len(matching_orders) != 1:
        fail(
            "Expected exactly one persisted idempotent order, "
            f"found {len(matching_orders)}"
        )

    ok("Idempotent retry created no duplicate order")

    # 25. Concurrent same-key requests must converge
    concurrent_key = str(uuid.uuid4())

    concurrent_body = {
        "customerId": customer_id,
        "items": [
            {
                "productId": product_id,
                "quantity": 1,
            }
        ],
        "notes": "Concurrent idempotency regression test",
    }

    def create_concurrent_order():
        return request(
            "POST",
            f"{api}/orders",
            token,
            concurrent_body,
            idempotency_key=concurrent_key,
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(create_concurrent_order)
            for _ in range(2)
        ]

        concurrent_results = [
            future.result()
            for future in futures
        ]

    concurrent_statuses = sorted(
        status
        for status, _ in concurrent_results
    )

    if concurrent_statuses != [200, 201]:
        print(json.dumps(
            [
                {
                    "status": status,
                    "payload": payload,
                }
                for status, payload in concurrent_results
            ],
            indent=2,
        ))
        fail(
            "Concurrent same-key order requests did not "
            f"return one 201 and one 200: "
            f"{concurrent_statuses}"
        )

    concurrent_order_ids = {
        payload.get("order", {}).get("orderId")
        for _, payload in concurrent_results
    }

    if len(concurrent_order_ids) != 1:
        fail(
            "Concurrent same-key requests returned "
            "different orderIds"
        )

    concurrent_order_id = next(
        iter(concurrent_order_ids)
    )

    if not concurrent_order_id:
        fail(
            "Concurrent idempotency test returned "
            "no orderId"
        )

    expected_concurrent_order_id = (
        f"ord-{concurrent_key}"
    )

    if (
        concurrent_order_id
        != expected_concurrent_order_id
    ):
        fail(
            "Concurrent deterministic orderId mismatch: "
            f"expected {expected_concurrent_order_id}, "
            f"got {concurrent_order_id}"
        )

    cleanup.track_order(concurrent_order_id)

    replay_payloads = [
        payload
        for status, payload in concurrent_results
        if status == 200
    ]

    if (
        len(replay_payloads) != 1
        or replay_payloads[0].get(
            "idempotentReplay"
        ) is not True
    ):
        fail(
            "Concurrent loser did not return "
            "an idempotent replay response"
        )

    ok(
        "Concurrent same-key requests converged "
        "to one order"
    )

    print()
    print("==========================================")
    print("ALL ORDER IDEMPOTENCY TESTS PASSED")
    print("==========================================")

    print()
    print("==========================================")
    print("ALL NEGATIVE BUSINESS-RULE TESTS PASSED")
    print("==========================================")

    print()
    print("==========================================")
    print("ALL CORE WORKFLOW TESTS PASSED")
    print("==========================================")
    print()
    print(f"Product ID : {product_id}")
    print(f"Customer ID: {customer_id}")
    print(f"Order ID   : {order_id}")
    print(f"Invoice ID : {invoice_id}")
    print()


if __name__ == "__main__":
    main()
