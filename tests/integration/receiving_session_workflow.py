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
    parser.add_argument("--sessions-table", required=True)

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

    sessions_table = dynamodb.Table(
        args.sessions_table
    )

    company_a = "company-ynj-001"
    company_b = "company-regression-002"

    suffix = uuid.uuid4().hex[:8]

    product_a = f"session-test-a-{suffix}"

    barcode = "".join(
        str(ord(char) % 10)
        for char in f"94{suffix}01"
    )[:12].ljust(12, "4")

    session_ids = []
    receipt_ids = []

    try:
        print()
        print("==========================================")
        print("DISTRODEX RECEIVING SESSION REGRESSION")
        print("==========================================")
        print()

        # ---------------------------------------------
        # Create session
        # ---------------------------------------------

        status, body = request(
            "POST",
            f"{api}/inventory/receiving-sessions",
            args.token_a,
            {
                "reference": f"PO-{suffix}",
                "notes": "Receiving session regression test",
            },
        )

        expect_status(
            "Create Tenant A receiving session",
            status,
            201,
        )

        session = body.get("session", {})

        session_id = str(
            session.get("sessionId", "")
        ).strip()

        expect(
            session_id.startswith("rcvsess-"),
            "Session ID is missing or malformed",
        )

        session_ids.append(
            (company_a, session_id)
        )

        expect(
            session.get("status") == "OPEN",
            "New receiving session is not OPEN",
        )

        expect(
            int(session.get("receiptCount", -1)) == 0,
            "New session receiptCount is not zero",
        )

        expect(
            int(session.get("totalUnitsReceived", -1)) == 0,
            "New session totalUnitsReceived is not zero",
        )

        expect(
            bool(str(session.get("startedBy", "")).strip()),
            "Session startedBy was not populated",
        )

        print("[PASS] New receiving session fields are correct")

        # ---------------------------------------------
        # Verify persisted session
        # ---------------------------------------------

        persisted_session = sessions_table.get_item(
            Key={
                "companyId": company_a,
                "sessionId": session_id,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            persisted_session is not None,
            "Receiving session was not persisted",
        )

        expect(
            persisted_session.get("status") == "OPEN",
            "Persisted receiving session is not OPEN",
        )

        print("[PASS] Receiving session persisted")

        # ---------------------------------------------
        # Create barcode inventory fixture
        # ---------------------------------------------

        status, _ = request(
            "POST",
            f"{api}/inventory",
            args.token_a,
            {
                "productId": product_a,
                "productName": "Session Regression Product",
                "quantityInStock": 5,
                "barcode": barcode,
                "barcodeType": "UPC-A",
            },
        )

        expect_status(
            "Create session inventory product",
            status,
            201,
        )

        # ---------------------------------------------
        # Receive within session
        # ---------------------------------------------

        status, body = request(
            "POST",
            f"{api}/inventory/receive",
            args.token_a,
            {
                "sessionId": session_id,
                "barcode": barcode,
                "quantityReceived": 6,
            },
        )

        expect_status(
            "Receive inventory within session",
            status,
            201,
        )

        receipt = body.get("receipt", {})

        receipt_id = str(
            receipt.get("receiptId", "")
        ).strip()

        expect(
            receipt_id.startswith("rcv-"),
            "Session receive receiptId is malformed",
        )

        receipt_ids.append(
            (company_a, receipt_id)
        )

        expect(
            receipt.get("sessionId") == session_id,
            "Receipt is not linked to session",
        )

        expect(
            int(body.get("item", {}).get("quantityInStock", -1)) == 11,
            "Session receive did not increment inventory",
        )

        print("[PASS] Receipt linked to receiving session")

        # ---------------------------------------------
        # Verify session counters
        # ---------------------------------------------

        updated_session = sessions_table.get_item(
            Key={
                "companyId": company_a,
                "sessionId": session_id,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            updated_session is not None,
            "Updated receiving session not found",
        )

        expect(
            int(updated_session.get("receiptCount", -1)) == 1,
            "Session receiptCount did not increment",
        )

        expect(
            int(updated_session.get("totalUnitsReceived", -1)) == 6,
            "Session totalUnitsReceived did not increment",
        )

        expect(
            updated_session.get("status") == "OPEN",
            "Receiving changed session status unexpectedly",
        )

        print("[PASS] Session counters updated atomically")

        # ---------------------------------------------
        # Verify persisted receipt linkage
        # ---------------------------------------------

        persisted_receipt = receipts_table.get_item(
            Key={
                "companyId": company_a,
                "receiptId": receipt_id,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            persisted_receipt is not None,
            "Session receipt was not persisted",
        )

        expect(
            persisted_receipt.get("sessionId") == session_id,
            "Persisted receipt lost sessionId",
        )

        print("[PASS] Persisted receipt retains session linkage")

        # ---------------------------------------------
        # Complete receiving session
        # ---------------------------------------------

        status, body = request(
            "POST",
            f"{api}/inventory/receiving-sessions/{session_id}/complete",
            args.token_a,
        )

        expect_status(
            "Complete receiving session",
            status,
            200,
        )

        completed_session = body.get("session", {})

        expect(
            completed_session.get("status") == "COMPLETED",
            "Session status did not transition to COMPLETED",
        )

        expect(
            bool(str(
                completed_session.get("completedAt", "")
            ).strip()),
            "completedAt was not populated",
        )

        expect(
            bool(str(
                completed_session.get("completedBy", "")
            ).strip()),
            "completedBy was not populated",
        )

        expect(
            int(completed_session.get("receiptCount", -1)) == 1,
            "Completed session receiptCount changed unexpectedly",
        )

        expect(
            int(completed_session.get("totalUnitsReceived", -1)) == 6,
            "Completed session totalUnitsReceived changed unexpectedly",
        )

        print("[PASS] Receiving session completed correctly")

        # ---------------------------------------------
        # Reject duplicate completion
        # ---------------------------------------------

        status, _ = request(
            "POST",
            f"{api}/inventory/receiving-sessions/{session_id}/complete",
            args.token_a,
        )

        expect_status(
            "Reject second session completion",
            status,
            409,
        )

        # ---------------------------------------------
        # Reject receive against completed session
        # ---------------------------------------------

        inventory_before_closed_receive = inventory_table.get_item(
            Key={
                "companyId": company_a,
                "productId": product_a,
            },
            ConsistentRead=True,
        ).get("Item")

        quantity_before_closed_receive = int(
            inventory_before_closed_receive["quantityInStock"]
        )

        status, _ = request(
            "POST",
            f"{api}/inventory/receive",
            args.token_a,
            {
                "sessionId": session_id,
                "barcode": barcode,
                "quantityReceived": 3,
            },
        )

        expect_status(
            "Reject receive against completed session",
            status,
            409,
        )

        inventory_after_closed_receive = inventory_table.get_item(
            Key={
                "companyId": company_a,
                "productId": product_a,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            int(
                inventory_after_closed_receive["quantityInStock"]
            ) == quantity_before_closed_receive,
            "Closed-session receive changed inventory quantity",
        )

        closed_session = sessions_table.get_item(
            Key={
                "companyId": company_a,
                "sessionId": session_id,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            closed_session.get("status") == "COMPLETED",
            "Closed session status changed unexpectedly",
        )

        expect(
            int(closed_session.get("receiptCount", -1)) == 1,
            "Closed-session receive changed receiptCount",
        )

        expect(
            int(closed_session.get("totalUnitsReceived", -1)) == 6,
            "Closed-session receive changed totalUnitsReceived",
        )

        print("[PASS] Completed session blocks further receiving")

        # ---------------------------------------------
        # Tenant isolation
        # ---------------------------------------------

        status, _ = request(
            "POST",
            f"{api}/inventory/receive",
            args.token_b,
            {
                "sessionId": session_id,
                "barcode": barcode,
                "quantityReceived": 2,
            },
        )

        expect_status(
            "Tenant B cannot use Tenant A session",
            status,
            404,
        )

        tenant_a_session_after_attack = sessions_table.get_item(
            Key={
                "companyId": company_a,
                "sessionId": session_id,
            },
            ConsistentRead=True,
        ).get("Item")

        expect(
            int(
                tenant_a_session_after_attack[
                    "totalUnitsReceived"
                ]
            ) == 6,
            "Cross-tenant request changed session totals",
        )

        print("[PASS] Receiving session is tenant isolated")

        # ---------------------------------------------
        # Unknown session
        # ---------------------------------------------

        status, _ = request(
            "POST",
            f"{api}/inventory/receive",
            args.token_a,
            {
                "sessionId": f"rcvsess-missing-{suffix}",
                "barcode": barcode,
                "quantityReceived": 2,
            },
        )

        expect_status(
            "Reject nonexistent receiving session",
            status,
            404,
        )

        print()
        print("==========================================")
        print("ALL RECEIVING SESSION TESTS PASSED")
        print("==========================================")
        print()

    finally:
        try:
            existing = inventory_table.get_item(
                Key={
                    "companyId": company_a,
                    "productId": product_a,
                },
                ConsistentRead=True,
            ).get("Item")

            if existing:
                inventory_table.delete_item(
                    Key={
                        "companyId": company_a,
                        "productId": product_a,
                    }
                )

                item_barcode = existing.get("barcode")

                if item_barcode:
                    barcode_table.delete_item(
                        Key={
                            "companyId": company_a,
                            "barcode": item_barcode,
                        }
                    )

        except Exception as error:
            print(
                f"[WARN] Product cleanup failed: {error}",
                file=sys.stderr,
            )

        for company_id, receipt_id in receipt_ids:
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

        for company_id, session_id in session_ids:
            try:
                sessions_table.delete_item(
                    Key={
                        "companyId": company_id,
                        "sessionId": session_id,
                    }
                )
            except Exception as error:
                print(
                    f"[WARN] Session cleanup failed: {error}",
                    file=sys.stderr,
                )


if __name__ == "__main__":
    main()
