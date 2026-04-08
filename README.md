# Flux v2 + AKS GitOps Demo

Deploy [podinfo](https://github.com/stefanprodan/podinfo) to AKS using **Flux v2** GitOps — out of the box, no image build required. The app image (`ghcr.io/stefanprodan/podinfo`) is publicly available.

## Architecture

```
GitHub Repo (this repo)
  │
  │  Flux v2 watches for changes (every 1m)
  ▼
┌──────────────┐     ┌─────────────────────┐
│  Flux v2     │────▶│  AKS Cluster        │
│  (flux-system)│     │                     │
└──────────────┘     │  ┌───────────────┐  │
                     │  │ podinfo ns    │  │
                     │  │  Deployment   │  │
                     │  │  Service (LB) │  │
                     │  └───────────────┘  │
                     └─────────────────────┘

Image: ghcr.io/stefanprodan/podinfo (public, no ACR needed)
```

## Repo Structure

```
├── k8s/
│   ├── base/                     # Base Kubernetes manifests
│   │   ├── kustomization.yaml
│   │   ├── namespace.yaml
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── overlays/
│       ├── staging/              # 1 replica
│       └── production/           # 3 replicas
├── clusters/
│   └── my-cluster/
│       ├── sources/
│       │   └── git-repository.yaml   # Flux GitRepository source
│       └── apps/
│           ├── staging.yaml          # Flux Kustomization (staging)
│           └── production.yaml       # Flux Kustomization (production, depends on staging)
├── setup.sh                      # One-command AKS + Flux provisioning
└── cleanup.sh                    # Tear everything down
```

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Flux CLI v2](https://fluxcd.io/flux/installation/#install-the-flux-cli)
- A GitHub account with a [Personal Access Token](https://github.com/settings/tokens) (repo scope)

## Quick Start

```bash
# 1. Fork/clone this repo
git clone https://github.com/fabricekrebs/fluxv2-demo-app.git
cd fluxv2-demo-app

# 2. Log in to Azure
az login

# 3. Set required env vars
export GITHUB_TOKEN=ghp_your_pat_here
export GITHUB_USER=your-github-username

# 4. Run setup (creates AKS, bootstraps Flux — no image build needed!)
./setup.sh

# 5. Get the app URL
kubectl get svc -n podinfo -w
# Open the EXTERNAL-IP in your browser
```

## How GitOps Works Here

1. **You push a change** to `main` (e.g., bump image tag, change replicas, update env vars).
2. **Flux detects the change** within ~1 minute (`interval: 1m` on the GitRepository).
3. **Flux reconciles** the Kustomization, applying the new state to the cluster.
4. **Staging deploys first** — production has `dependsOn: staging`, so it waits for staging to be healthy.

### Demo: Trigger a GitOps Deployment

```bash
# Change the UI message
sed -i 's/Deployed with Flux v2 on AKS!/Hello from GitOps!/' k8s/base/deployment.yaml
git add -A && git commit -m "Update podinfo message" && git push

# Watch Flux reconcile
flux get kustomizations --watch
```

### Demo: Bump the Image Version

```bash
# Update the podinfo image tag
sed -i 's|ghcr.io/stefanprodan/podinfo:6.7.1|ghcr.io/stefanprodan/podinfo:6.7.0|' k8s/base/deployment.yaml
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
kubectl get all -n podinfo
kubectl logs -n podinfo -l app=podinfo

# Force reconciliation (don't wait for interval)
flux reconcile source git fluxv2-demo-app
flux reconcile kustomization podinfo-staging

# Suspend/resume (pause GitOps)
flux suspend kustomization podinfo-production
flux resume kustomization podinfo-production
```

## Cleanup

```bash
./cleanup.sh
# or manually:
az group delete --name fluxv2-demo-rg --yes --no-wait
```

## License

MIT
