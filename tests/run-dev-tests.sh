#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DISTRODEX_DEV_API:-}" ]]; then
  echo "DISTRODEX_DEV_API is not set."
  exit 1
fi

if [[ -z "${DISTRODEX_ID_TOKEN:-}" ]]; then
  echo "DISTRODEX_ID_TOKEN is not set."
  echo "Authenticate first, then rerun."
  exit 1
fi

EXPECTED_DEV_API="https://ra280rph8l.execute-api.us-east-1.amazonaws.com"

if [[ "$DISTRODEX_DEV_API" != "$EXPECTED_DEV_API" ]]; then
  echo "SAFETY STOP:"
  echo "Regression tests may only run against the known DEV API."
  echo
  echo "Expected: $EXPECTED_DEV_API"
  echo "Actual:   $DISTRODEX_DEV_API"
  exit 1
fi

REGION="us-east-1"

INVENTORY_TABLE="$(terraform output -raw inventory_table_name)"
CUSTOMERS_TABLE="$(terraform output -raw customers_table_name)"
ORDERS_TABLE="$(terraform output -raw orders_table_name)"
INVOICES_TABLE="$(terraform output -raw invoices_table_name)"

for table in \
  "$INVENTORY_TABLE" \
  "$CUSTOMERS_TABLE" \
  "$ORDERS_TABLE" \
  "$INVOICES_TABLE"
do
  if [[ "$table" != ynj-dev-* ]]; then
    echo "SAFETY STOP:"
    echo "Non-DEV DynamoDB table detected: $table"
    exit 1
  fi
done

python3 tests/integration/core_workflow.py \
  --api "$DISTRODEX_DEV_API" \
  --token "$DISTRODEX_ID_TOKEN" \
  --region "$REGION" \
  --inventory-table "$INVENTORY_TABLE" \
  --customers-table "$CUSTOMERS_TABLE" \
  --orders-table "$ORDERS_TABLE" \
  --invoices-table "$INVOICES_TABLE"
