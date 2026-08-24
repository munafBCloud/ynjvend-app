#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

package_file() {
    local source="$1"
    local output="$2"

    local source_dir
    local source_name
    local output_name

    source_dir="$(dirname "$source")"
    source_name="$(basename "$source")"
    output_name="$(basename "$output")"

    if [[ ! -f "$ROOT_DIR/$source" ]]; then
        echo "ERROR: Missing source: $source" >&2
        exit 1
    fi

    rm -f "$ROOT_DIR/$output"

    (
        cd "$ROOT_DIR/$source_dir"
        zip -q "$output_name" "$source_name"
    )

    echo "Packaged: $output"
}

package_file \
  lambda/create_inventory.py \
  lambda/create_inventory.zip

package_file \
  lambda/update_inventory.py \
  lambda/update_inventory.zip

package_file \
  lambda/get_inventory_by_barcode.py \
  lambda/get_inventory_by_barcode.zip

package_file \
  lambda/receive_inventory.py \
  lambda/receive_inventory.zip

package_file \
  lambda/create_receiving_session.py \
  lambda/create_receiving_session.zip

echo
echo "Barcode Lambda artifacts packaged."
