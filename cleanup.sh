#!/usr/bin/env bash
#
# cleanup.sh — Tear down all resources created by setup.sh
#
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-fluxv2-demo-rg}"

echo "This will DELETE resource group '$RESOURCE_GROUP' and ALL resources inside it."
read -rp "Are you sure? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Cancelled."
  exit 0
fi

echo "Deleting resource group: $RESOURCE_GROUP ..."
az group delete --name "$RESOURCE_GROUP" --yes --no-wait
echo "Deletion started (runs in background). Check Azure portal for status."
