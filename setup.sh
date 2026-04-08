#!/usr/bin/env bash
#
# setup.sh — Provision AKS, ACR, build/push image, bootstrap Flux v2, and deploy the Whack-a-Pod game.
#
# Prerequisites: az cli, kubectl, flux cli (v2), docker
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
ACR_NAME="${ACR_NAME:-fluxv2demoacr${RANDOM}}"
IMAGE_TAG="${IMAGE_TAG:-1.0.0}"
GITHUB_USER="${GITHUB_USER:?Set GITHUB_USER}"
GITHUB_REPO="${GITHUB_REPO:-fluxv2-demo-app}"
GITHUB_TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN}"

echo "============================================"
echo "  Flux v2 + AKS Demo — Whack-a-Pod Setup"
echo "============================================"

# ---- 1. Resource Group ----
echo "[1/7] Creating resource group: $RESOURCE_GROUP"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none

# ---- 2. ACR ----
echo "[2/7] Creating Azure Container Registry: $ACR_NAME"
az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic -o none

# ---- 3. AKS Cluster ----
echo "[3/7] Creating AKS cluster: $AKS_CLUSTER"
az aks create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER" \
  --node-count 2 \
  --attach-acr "$ACR_NAME" \
  --generate-ssh-keys \
  --enable-managed-identity \
  -o none

echo "[3/7] Getting AKS credentials"
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --overwrite-existing

# ---- 4. Build & Push Image ----
echo "[4/7] Building and pushing container image"
az acr build --registry "$ACR_NAME" --image "whack-a-pod:${IMAGE_TAG}" .

# ---- 5. Update deployment image reference ----
echo "[5/7] Patching deployment manifest with ACR image"
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
sed -i "s|\\\${ACR_NAME}.azurecr.io/whack-a-pod:.*|${ACR_LOGIN_SERVER}/whack-a-pod:${IMAGE_TAG}|g" \
  k8s/base/deployment.yaml

# ---- 6. Update Flux GitRepository URL ----
echo "[6/7] Patching Flux GitRepository source URL"
GIT_URL="https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
sed -i "s|\\\${GIT_REPO_URL}|${GIT_URL}|g" \
  clusters/my-cluster/sources/git-repository.yaml

# ---- 7. Bootstrap Flux ----
echo "[7/7] Bootstrapping Flux v2 on the AKS cluster"
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
