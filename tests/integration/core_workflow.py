#!/usr/bin/env python3

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from decimal import Decimal


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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", required=True)
    parser.add_argument("--token", required=True)
    args = parser.parse_args()

    api = args.api.rstrip("/")
    token = args.token

    unique = f"regtest-{int(time.time())}"

    product_id = f"{unique}-product"
    selling_price = Decimal("7.25")
    initial_quantity = 20
    order_quantity = 3
    expected_total = selling_price * order_quantity

    print()
    print("==========================================")
    print("DISTRODEX DEV CORE WORKFLOW REGRESSION TEST")
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
