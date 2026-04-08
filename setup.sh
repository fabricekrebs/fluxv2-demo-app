#!/usr/bin/env bash
#
# setup.sh — Provision AKS and bootstrap Flux v2.
# The app uses a public container image (ghcr.io/stefanprodan/podinfo) — no build needed.
#
# Prerequisites: az cli, kubectl, flux cli (v2)
#
# Usage:
#   export GITHUB_TOKEN=ghp_xxxx        # PAT with repo scope
#   export GITHUB_USER=your-username
#   export GITHUB_REPO=fluxv2-demo-app
#   ./setup.sh
#
set -euo pipefail

#----- Configuration (override via env vars) -----
RESOURCE_GROUP="${RESOURCE_GROUP:-fluxv2-demo-rg}"
LOCATION="${LOCATION:-eastus}"
AKS_CLUSTER="${AKS_CLUSTER:-fluxv2-demo-aks}"
GITHUB_USER="${GITHUB_USER:?Set GITHUB_USER}"
GITHUB_REPO="${GITHUB_REPO:-fluxv2-demo-app}"
GITHUB_TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN}"

echo "============================================"
echo "  Flux v2 + AKS Demo — Setup"
echo "============================================"

# ---- 1. Resource Group ----
echo "[1/4] Creating resource group: $RESOURCE_GROUP"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none

# ---- 2. AKS Cluster ----
echo "[2/4] Creating AKS cluster: $AKS_CLUSTER"
az aks create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER" \
  --node-count 2 \
  --generate-ssh-keys \
  --enable-managed-identity \
  -o none

echo "[2/4] Getting AKS credentials"
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --overwrite-existing

# ---- 3. Pre-flight check ----
echo "[3/4] Verifying Flux prerequisites"
flux check --pre

# ---- 4. Bootstrap Flux ----
echo "[4/4] Bootstrapping Flux v2 on the AKS cluster"
flux bootstrap github \
  --owner="$GITHUB_USER" \
  --repository="$GITHUB_REPO" \
  --branch=main \
  --path=clusters/my-cluster \
  --personal \
  --token-auth

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "Flux will now reconcile the cluster state from Git."
echo ""
echo "Useful commands:"
echo "  flux get kustomizations        # check reconciliation status"
echo "  flux get sources git           # check git source"
echo "  kubectl get pods -n whack-a-pod"
echo "  kubectl get svc -n whack-a-pod # get the EXTERNAL-IP to play the game!"
echo ""
