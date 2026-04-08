# Whack-a-Pod! — Flux v2 + AKS GitOps Demo

A Kubernetes-themed **whack-a-mole** game deployed to AKS via **Flux v2** GitOps. Smash pods, dodge CrashLoopBackOffs, and earn your Cluster Admin rank!

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
                     │  │ whack-a-pod ns│  │
                     │  │  Deployment   │  │
                     │  │  Service (LB) │  │
                     │  └───────────────┘  │
                     └─────────────────────┘
```

## What's in the Repo

```
├── app/                          # Node.js game application
│   ├── server.js
│   └── package.json
├── Dockerfile
├── k8s/
│   ├── base/                     # Base Kubernetes manifests
│   │   ├── kustomization.yaml
│   │   ├── namespace.yaml
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── overlays/
│       ├── staging/              # 1 replica, staging version tag
│       └── production/           # 3 replicas, production version tag
├── clusters/
│   └── my-cluster/
│       ├── sources/
│       │   └── git-repository.yaml   # Flux GitRepository source
│       └── apps/
│           ├── staging.yaml          # Flux Kustomization (staging)
│           └── production.yaml       # Flux Kustomization (production)
├── setup.sh                      # One-command provisioning
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
git clone https://github.com/<your-user>/fluxv2-demo-app.git
cd fluxv2-demo-app

# 2. Log in to Azure
az login

# 3. Set required env vars
export GITHUB_TOKEN=ghp_your_pat_here
export GITHUB_USER=your-github-username
export GITHUB_REPO=fluxv2-demo-app

# 4. Run setup (creates AKS, ACR, builds image, bootstraps Flux)
./setup.sh

# 5. Wait for reconciliation then grab the game URL
kubectl get svc -n whack-a-pod -w
# Open the EXTERNAL-IP in your browser and play!
```

## How GitOps Works Here

1. **You push a change** to `main` (e.g., update `APP_VERSION`, change replicas, new image tag).
2. **Flux detects the change** within ~1 minute (configured `interval: 1m` on the GitRepository).
3. **Flux reconciles** the Kustomization, applying the new state to the cluster.
4. **Staging deploys first** — production has `dependsOn: staging`, so it waits for staging to be healthy.

### Demo: Trigger a GitOps Deployment

```bash
# Change the version label shown in the game
sed -i 's/value: "1.0.0"/value: "2.0.0"/' k8s/base/deployment.yaml
git add -A && git commit -m "Bump to v2.0.0" && git push

# Watch Flux reconcile
flux get kustomizations --watch
```

## Useful Commands

```bash
# Flux status
flux get kustomizations
flux get sources git
flux logs

# App status
kubectl get all -n whack-a-pod
kubectl logs -n whack-a-pod -l app=whack-a-pod

# Force reconciliation (don't wait for interval)
flux reconcile source git fluxv2-demo-app
flux reconcile kustomization whack-a-pod-staging

# Suspend/resume (pause GitOps)
flux suspend kustomization whack-a-pod-production
flux resume kustomization whack-a-pod-production
```

## The Game

- **🐳 Pod** — Whack it! +10 points (combo multiplier up to x5)
- **☸️ Golden K8s** — Rare! +50 points
- **💀 CrashLoopBackOff** — Avoid! -30 points (resets combo)
- **🐛 Bug** — Avoid! -15 points (resets combo)

Ranks: Intern → Junior Dev → DevOps Engineer → SRE → Cluster Admin

## Cleanup

```bash
./cleanup.sh
# or manually:
az group delete --name fluxv2-demo-rg --yes --no-wait
```

## License

MIT
