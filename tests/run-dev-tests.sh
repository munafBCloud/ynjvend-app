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

python3 tests/integration/core_workflow.py \
  --api "$DISTRODEX_DEV_API" \
  --token "$DISTRODEX_ID_TOKEN"
