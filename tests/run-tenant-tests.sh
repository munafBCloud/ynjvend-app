#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
API="https://ra280rph8l.execute-api.us-east-1.amazonaws.com"
CLIENT_ID="4ha8unhf15v9c8mdqq5r5u3e27"

TENANT_A_EMAIL="munaf8289@gmail.com"
TENANT_B_EMAIL="mooney8289@gmail.com"

EXPECTED_POOL="us-east-1_hMX56kwza"

ACTIVE_POOL="$(terraform output -raw cognito_user_pool_id)"
ACTIVE_API="$(terraform output -raw api_endpoint)"

if [[ "$ACTIVE_POOL" != "$EXPECTED_POOL" ]]; then
  echo "SAFETY STOP: Terraform is not pointed at DEV Cognito."
  exit 1
fi

if [[ "$ACTIVE_API" != "$API" ]]; then
  echo "SAFETY STOP: Terraform is not pointed at DEV API."
  exit 1
fi

INVENTORY_TABLE="$(terraform output -raw inventory_table_name)"
CUSTOMERS_TABLE="$(terraform output -raw customers_table_name)"
ORDERS_TABLE="$(terraform output -raw orders_table_name)"

for table in \
  "$INVENTORY_TABLE" \
  "$CUSTOMERS_TABLE" \
  "$ORDERS_TABLE"
do
  if [[ "$table" != ynj-dev-* ]]; then
    echo "SAFETY STOP: Non-DEV table detected: $table"
    exit 1
  fi
done

read -s -p "Tenant A Cognito password: " PASSWORD_A
echo

AUTH_A="$(
  aws cognito-idp initiate-auth \
    --region "$REGION" \
    --client-id "$CLIENT_ID" \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters \
      USERNAME="$TENANT_A_EMAIL",PASSWORD="$PASSWORD_A"
)"

unset PASSWORD_A

TOKEN_A="$(
  printf '%s' "$AUTH_A" |
  python3 -c '
import json,sys
print(json.load(sys.stdin)["AuthenticationResult"]["IdToken"])
'
)"

unset AUTH_A

read -s -p "Tenant B Cognito password: " PASSWORD_B
echo

AUTH_B="$(
  aws cognito-idp initiate-auth \
    --region "$REGION" \
    --client-id "$CLIENT_ID" \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters \
      USERNAME="$TENANT_B_EMAIL",PASSWORD="$PASSWORD_B"
)"

unset PASSWORD_B

TOKEN_B="$(
  printf '%s' "$AUTH_B" |
  python3 -c '
import json,sys
print(json.load(sys.stdin)["AuthenticationResult"]["IdToken"])
'
)"

unset AUTH_B

python3 tests/integration/tenant_isolation.py \
  --api "$API" \
  --token-a "$TOKEN_A" \
  --token-b "$TOKEN_B" \
  --region "$REGION" \
  --inventory-table "$INVENTORY_TABLE" \
  --customers-table "$CUSTOMERS_TABLE" \
  --orders-table "$ORDERS_TABLE"

unset TOKEN_A
unset TOKEN_B
