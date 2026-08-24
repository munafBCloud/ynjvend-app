#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
EXPECTED_DEV_API="https://ra280rph8l.execute-api.us-east-1.amazonaws.com"

if [[ -z "${DISTRODEX_DEV_API:-}" ]]; then
  echo "DISTRODEX_DEV_API is not set."
  exit 1
fi

if [[ "$DISTRODEX_DEV_API" != "$EXPECTED_DEV_API" ]]; then
  echo "SAFETY STOP:"
  echo "Receiving-session tests may only run against DEV."
  exit 1
fi

TOKEN_A="${DISTRODEX_ID_TOKEN:-}"
TOKEN_B="${DISTRODEX_TENANT_B_ID_TOKEN:-}"

if [[ -z "$TOKEN_A" || -z "$TOKEN_B" ]]; then
  echo "Tenant A and Tenant B tokens are required."
  echo "Run through tests/run-all-dev-tests.sh."
  exit 1
fi

INVENTORY_TABLE="$(
  terraform output -raw inventory_table_name
)"

BARCODE_TABLE="$(
  terraform output -raw barcode_registry_table_name
)"

RECEIPTS_TABLE="$(
  terraform output -raw inventory_receipts_table_name
)"

SESSIONS_TABLE="$(
  terraform output -raw inventory_receiving_sessions_table_name
)"

for table in \
  "$INVENTORY_TABLE" \
  "$BARCODE_TABLE" \
  "$RECEIPTS_TABLE" \
  "$SESSIONS_TABLE"
do
  if [[ "$table" != ynj-dev-* ]]; then
    echo "SAFETY STOP: Non-DEV table detected: $table"
    exit 1
  fi
done

python3 tests/integration/receiving_session_workflow.py \
  --api "$DISTRODEX_DEV_API" \
  --token-a "$TOKEN_A" \
  --token-b "$TOKEN_B" \
  --region "$REGION" \
  --inventory-table "$INVENTORY_TABLE" \
  --barcode-table "$BARCODE_TABLE" \
  --receipts-table "$RECEIPTS_TABLE" \
  --sessions-table "$SESSIONS_TABLE"
