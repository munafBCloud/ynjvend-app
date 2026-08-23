#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
API="https://ra280rph8l.execute-api.us-east-1.amazonaws.com"
CLIENT_ID="4ha8unhf15v9c8mdqq5r5u3e27"

TENANT_A_EMAIL="munaf8289@gmail.com"
TENANT_B_EMAIL="mooney8289@gmail.com"

EXPECTED_POOL="us-east-1_hMX56kwza"

cleanup_tokens() {
  unset DISTRODEX_ID_TOKEN
  unset DISTRODEX_TENANT_B_ID_TOKEN
}

trap cleanup_tokens EXIT

echo
echo "=========================================="
echo "DISTRODEX DEV REGRESSION SUITE"
echo "=========================================="
echo

echo ">>> SAFETY CHECKS"

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

export DISTRODEX_DEV_API="$API"

echo "[PASS] DEV environment verified"
echo

echo ">>> AUTHENTICATION"
echo

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

export DISTRODEX_ID_TOKEN="$(
  printf '%s' "$AUTH_A" |
  python3 -c '
import json,sys
print(json.load(sys.stdin)["AuthenticationResult"]["IdToken"])
'
)"

unset AUTH_A

echo "[PASS] Tenant A authenticated"

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

export DISTRODEX_TENANT_B_ID_TOKEN="$(
  printf '%s' "$AUTH_B" |
  python3 -c '
import json,sys
print(json.load(sys.stdin)["AuthenticationResult"]["IdToken"])
'
)"

unset AUTH_B

echo "[PASS] Tenant B authenticated"

echo
echo ">>> PHASE 1: CORE WORKFLOW + BUSINESS RULES"
echo

./tests/run-dev-tests.sh

echo
echo ">>> PHASE 1 PASSED"
echo

echo ">>> PHASE 2: TENANT ISOLATION"
echo

./tests/run-tenant-tests.sh

echo
echo ">>> PHASE 2 PASSED"
echo

echo ">>> PHASE 3: FOUNDING BETA APPLICATION FLOW"
echo

./tests/run-beta-application-tests.sh

echo
echo ">>> PHASE 3 PASSED"
echo

echo ">>> PHASE 4: BARCODE INVENTORY WORKFLOW"
echo

./tests/run-barcode-tests.sh

echo
echo ">>> PHASE 4 PASSED"
echo

echo "=========================================="
echo "ALL DISTRODEX DEV REGRESSION TESTS PASSED"
echo "=========================================="
echo
