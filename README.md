# Flux v2 + AKS GitOps Demo

Deploy [podinfo](https://github.com/stefanprodan/podinfo) to AKS using **Flux v2** GitOps — out of the box, no image build required. Just point your AKS cluster's GitOps configuration at this repo.

## Architecture

```
GitHub Repo (this repo)
  │
  │  Flux v2 watches for changes
  ▼
┌──────────────┐     ┌─────────────────────┐
│  Flux v2     │────▶│  AKS Cluster        │
│  (flux-system)│     │                     │
└──────────────┘     │  ┌───────────────┐  │
                     │  │ fluxv2-podinfo-demo ns │  │
                     │  │  Deployment            │  │
                     │  │  Service (LB)          │  │
                     │  └───────────────┘  │
                     └─────────────────────┘

Image: ghcr.io/stefanprodan/podinfo (public, no ACR needed)
```

## Repo Structure

```
├── apps/
│   └── fluxv2-podinfo-demo/          # Kubernetes manifests
│       ├── kustomization.yaml
│       ├── namespace.yaml
│       ├── deployment.yaml
│       └── service.yaml
└── clusters/
    └── my-cluster/
        ├── sources/
        │   └── git-repository.yaml   # Flux GitRepository source
        └── apps/
            └── production.yaml       # Flux Kustomization
```

## Prerequisites

- An AKS cluster with the **GitOps (Flux v2)** extension enabled
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) with the `k8s-configuration` extension
- `kubectl` configured to point at your cluster

## Azure GitOps Configuration

The recommended way is to configure GitOps directly on your AKS cluster using the Azure Flux extension. This tells Flux on your cluster to watch this repo and deploy the application.

### Option 1: Azure CLI

Create a Flux configuration on your AKS cluster pointing to this repository:

```bash
# Enable the GitOps extension on your AKS cluster (if not already done)
az k8s-configuration flux create \
  --resource-group <your-resource-group> \
  --cluster-name <your-aks-cluster> \
  --cluster-type managedClusters \
  --name podinfo-demo \
  --namespace flux-system \
  --scope cluster \
  --url https://github.com/fabricekrebs/fluxv2-demo-app \
  --branch main \
  --kustomization name=fluxv2-podinfo-demo path=./apps/fluxv2-podinfo-demo prune=true sync_interval=5m
```

| Parameter        | Value                                                      |
|------------------|------------------------------------------------------------||
| **Repository URL** | `https://github.com/fabricekrebs/fluxv2-demo-app`        |
| **Branch**         | `main`                                                    |
| **Scope**          | `cluster`                                                 |
| **Kustomization**  | Name: `fluxv2-podinfo-demo`, Path: `./apps/fluxv2-podinfo-demo`, Prune: `true` |

### Option 2: Azure Portal

1. Navigate to your **AKS cluster** in the Azure Portal.
2. Go to **Settings → GitOps**.
3. Click **+ Create** and fill in:

   | Field                 | Value                                                    |
   |-----------------------|----------------------------------------------------------|
   | Configuration name    | `podinfo-demo`                                           |
   | Namespace             | `flux-system`                                            |
   | Scope                 | Cluster                                                  |
   | Repository URL        | `https://github.com/fabricekrebs/fluxv2-demo-app`        |
   | Reference type        | Branch                                                   |
   | Branch                | `main`                                                   |

4. Add a **Kustomization**:

   | Field            | Value                       |
   |------------------|-----------------------------| 
   | Instance name    | `fluxv2-podinfo-demo`     |
   | Path             | `./apps/fluxv2-podinfo-demo` |
   | Sync interval    | `5m`                        |
   | Prune            | Enabled                     |

5. Click **Save**. Flux will begin reconciling immediately.

### Verify the Deployment

```bash
# Check Flux status
flux get kustomizations

# Check the pods
kubectl get pods -n fluxv2-podinfo-demo

# Get the external IP to access the app
kubectl get svc -n fluxv2-podinfo-demo
```

## How GitOps Works Here

1. **You push a change** to `main` (e.g., bump image tag, change replicas, update env vars).
2. **Flux detects the change** within the sync interval.
3. **Flux reconciles** the Kustomization, applying the new state to the cluster.

### Demo: Trigger a GitOps Deployment

```bash
# Change the UI message
sed -i 's/Deployed with Flux v2 on AKS!/Hello from GitOps!/' apps/fluxv2-podinfo-demo/deployment.yaml
git add -A && git commit -m "Update podinfo message" && git push

# Watch Flux reconcile
flux get kustomizations --watch
```

### Demo: Bump the Image Version

```bash
# Update the podinfo image tag
sed -i 's|ghcr.io/stefanprodan/podinfo:6.7.1|ghcr.io/stefanprodan/podinfo:6.7.0|' apps/fluxv2-podinfo-demo/deployment.yaml
git add -A && git commit -m "Rollback to podinfo 6.7.0" && git push

flux get kustomizations --watch
```

## Useful Commands

```bash
# Flux status
flux get kustomizations
flux get sources git
flux logs

# App status
kubectl get all -n fluxv2-podinfo-demo
kubectl logs -n fluxv2-podinfo-demo -l app=fluxv2-podinfo-demo

# Force reconciliation
flux reconcile source git fluxv2-demo-app
flux reconcile kustomization fluxv2-podinfo-demo

# Suspend/resume (pause GitOps)
flux suspend kustomization fluxv2-podinfo-demo
flux resume kustomization fluxv2-podinfo-demo
```

## Cleanup

Remove the Flux configuration from your AKS cluster:

```bash
az k8s-configuration flux delete \
  --resource-group <your-resource-group> \
  --cluster-name <your-aks-cluster> \
  --cluster-type managedClusters \
  --name podinfo-demo \
  --yes
```

## License

MIT
