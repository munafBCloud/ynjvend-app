#!/usr/bin/env bash

set -euo pipefail

API_BASE_URL="${DEV_API:-https://ra280rph8l.execute-api.us-east-1.amazonaws.com}"
TABLE_NAME="${BETA_TABLE:-ynj-dev-beta-applications}"

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  echo "PASS: $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo "FAIL: $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"

  if [[ "$actual" == "$expected" ]]; then
    pass "$label"
  else
    fail "$label (expected HTTP $expected, got $actual)"
  fi
}

echo "============================================"
echo " Distro'Dex DEV Beta Applications Regression"
echo "============================================"
echo

TEST_ID="$(date +%s)-$RANDOM"
TEST_EMAIL="beta-regression-${TEST_ID}@example.com"
TEST_BUSINESS="Beta Regression ${TEST_ID}"

echo "API:   $API_BASE_URL"
echo "Table: $TABLE_NAME"
echo

echo "===== BASELINE COUNT ====="

BEFORE_COUNT="$(
  aws dynamodb scan \
    --table-name "$TABLE_NAME" \
    --select COUNT \
    --query 'Count' \
    --output text
)"

echo "Existing records: $BEFORE_COUNT"
echo


echo "===== VALID APPLICATION ====="

VALID_RESPONSE_FILE="$(mktemp)"
VALID_STATUS="$(
  curl -sS \
    -o "$VALID_RESPONSE_FILE" \
    -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    "$API_BASE_URL/beta-applications" \
    -d "{
      \"businessName\": \"$TEST_BUSINESS\",
      \"contactName\": \"Regression Test User\",
      \"email\": \"$TEST_EMAIL\",
      \"phone\": \"555-555-0199\",
      \"distributionType\": \"Independent wholesale distributor\",
      \"skuRange\": \"100-500\",
      \"teamSize\": \"2-5\",
      \"currentSystem\": \"Spreadsheets\",
      \"biggestProblem\": \"Automated regression validation for the beta application workflow.\",
      \"notes\": \"DEV automated regression submission.\"
    }"
)"

cat "$VALID_RESPONSE_FILE"
echo

assert_status "$VALID_STATUS" "201" "Valid beta application returns 201"

APPLICATION_ID="$(
  python3 - "$VALID_RESPONSE_FILE" <<'PY'
import json
import sys

with open(sys.argv[1]) as f:
    data = json.load(f)

print(data.get("applicationId", ""))
PY
)"

if [[ -n "$APPLICATION_ID" ]]; then
  pass "Server generated applicationId"
else
  fail "Server generated applicationId"
fi

rm -f "$VALID_RESPONSE_FILE"

echo


echo "===== MISSING REQUIRED FIELD ====="

MISSING_RESPONSE_FILE="$(mktemp)"
MISSING_STATUS="$(
  curl -sS \
    -o "$MISSING_RESPONSE_FILE" \
    -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    "$API_BASE_URL/beta-applications" \
    -d '{
      "businessName": "Missing Email Regression",
      "contactName": "Regression User",
      "distributionType": "Wholesale",
      "currentSystem": "Spreadsheets",
      "biggestProblem": "Regression test"
    }'
)"

cat "$MISSING_RESPONSE_FILE"
echo

assert_status "$MISSING_STATUS" "400" "Missing required field returns 400"

rm -f "$MISSING_RESPONSE_FILE"

echo


echo "===== INVALID EMAIL ====="

INVALID_RESPONSE_FILE="$(mktemp)"
INVALID_STATUS="$(
  curl -sS \
    -o "$INVALID_RESPONSE_FILE" \
    -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    "$API_BASE_URL/beta-applications" \
    -d '{
      "businessName": "Invalid Email Regression",
      "contactName": "Regression User",
      "email": "invalid-email",
      "distributionType": "Wholesale",
      "currentSystem": "Spreadsheets",
      "biggestProblem": "Regression test"
    }'
)"

cat "$INVALID_RESPONSE_FILE"
echo

assert_status "$INVALID_STATUS" "400" "Invalid email returns 400"

rm -f "$INVALID_RESPONSE_FILE"

echo


echo "===== VERIFY WRITTEN RECORD ====="

if [[ -n "$APPLICATION_ID" ]]; then
  ITEM_JSON="$(
    aws dynamodb get-item \
      --table-name "$TABLE_NAME" \
      --key "{\"applicationId\":{\"S\":\"$APPLICATION_ID\"}}" \
      --consistent-read \
      --output json
  )"

  ITEM_EXISTS="$(
    python3 - <<PY
import json

data = json.loads('''$ITEM_JSON''')
print("yes" if data.get("Item") else "no")
PY
  )"

  if [[ "$ITEM_EXISTS" == "yes" ]]; then
    pass "Valid application persisted to DynamoDB"
  else
    fail "Valid application persisted to DynamoDB"
  fi

  STATUS_VALUE="$(
    python3 - <<PY
import json

data = json.loads('''$ITEM_JSON''')
print(data.get("Item", {}).get("status", {}).get("S", ""))
PY
  )"

  if [[ "$STATUS_VALUE" == "submitted" ]]; then
    pass "Stored application status is submitted"
  else
    fail "Stored application status is submitted (got: $STATUS_VALUE)"
  fi

  SUBMITTED_AT="$(
    python3 - <<PY
import json

data = json.loads('''$ITEM_JSON''')
print(data.get("Item", {}).get("submittedAt", {}).get("S", ""))
PY
  )"

  if [[ -n "$SUBMITTED_AT" ]]; then
    pass "Server generated submittedAt timestamp"
  else
    fail "Server generated submittedAt timestamp"
  fi

  STORED_EMAIL="$(
    python3 - <<PY
import json

data = json.loads('''$ITEM_JSON''')
print(data.get("Item", {}).get("email", {}).get("S", ""))
PY
  )"

  if [[ "$STORED_EMAIL" == "$TEST_EMAIL" ]]; then
    pass "Stored email matches valid submission"
  else
    fail "Stored email matches valid submission"
  fi
fi

echo


echo "===== FINAL COUNT ====="

AFTER_COUNT="$(
  aws dynamodb scan \
    --table-name "$TABLE_NAME" \
    --select COUNT \
    --query 'Count' \
    --output text
)"

echo "Records before: $BEFORE_COUNT"
echo "Records after:  $AFTER_COUNT"

EXPECTED_COUNT=$((BEFORE_COUNT + 1))

if [[ "$AFTER_COUNT" -eq "$EXPECTED_COUNT" ]]; then
  pass "Only valid application was persisted"
else
  fail "Only valid application was persisted (expected $EXPECTED_COUNT records, got $AFTER_COUNT)"
fi

echo


echo "===== CLEANUP TEST RECORD ====="

if [[ -n "$APPLICATION_ID" ]]; then
  aws dynamodb delete-item \
    --table-name "$TABLE_NAME" \
    --key "{\"applicationId\":{\"S\":\"$APPLICATION_ID\"}}"

  pass "Regression test record cleaned up"
fi

echo


echo "============================================"
echo " RESULTS"
echo "============================================"
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo
  echo "BETA APPLICATION REGRESSION: FAILED"
  exit 1
fi

echo
echo "BETA APPLICATION REGRESSION: PASSED"
