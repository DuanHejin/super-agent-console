# Ops Runbook

This runbook records the current deployment and operations baseline for Super Agent Console.

## Current Runtime Topology

```txt
Browser
→ domain DNS
→ Hong Kong lightweight server
→ K3S ingress
→ my-web-svc
→ my-web-app deployment
→ Nuxt Nitro server on port 3000
```

## K3S Resources

Current default resources:

```txt
namespace: default
deployment: my-web-app
container: my-web-app
service: my-web-svc
containerPort: 3000
```

Useful checks:

```bash
kubectl get deployment my-web-app -n default
kubectl get svc my-web-svc -n default
kubectl get pods -n default
kubectl rollout status deployment/my-web-app -n default
```

## Release Flow

The release flow is intentionally simple:

```txt
development branch
→ PR to release
→ merge to release
→ GitHub Actions builds Docker image
→ image is pushed to GHCR
→ Actions SSH into K3S server
→ kubectl set image
→ rollout status
```

Workflow file:

```txt
.github/workflows/release-docker-k3s.yml
```

The workflow expects these GitHub Actions secrets:

```txt
GHCR_TOKEN
K3S_SSH_HOST
K3S_SSH_PORT
K3S_SSH_USER
K3S_SSH_PRIVATE_KEY
```

Before merging release PRs, confirm the source branch is not `release` and that no tokens, private keys, `.env` files, or kubeconfig files are committed.

## Image Registry

Current image registry:

```txt
ghcr.io/duanhejin/super-agent-console
```

K3S pulls this private image with:

```txt
imagePullSecret: ghcr-secret
```

If pods enter `ImagePullBackOff`, check:

```bash
kubectl describe pod POD_NAME -n default
kubectl get deployment my-web-app -n default -o yaml
```

Common causes:

- `ghcr-secret` is missing or not bound to the Deployment.
- The GitHub token used by `ghcr-secret` does not have `read:packages`.
- The image tag does not exist.
- The server cannot reach `ghcr.io`.

## ConfigMap And Secret

Production runtime configuration is injected with:

```txt
k8s/configmap.yaml
k8s/secret.example.yaml
k8s/deployment-env-patch.yaml
```

ConfigMap holds non-sensitive values.

Secret holds sensitive values. Do not commit real Secret values.

Apply/update ConfigMap:

```bash
kubectl apply -f k8s/configmap.yaml
```

Create/update real Secret on the server:

```bash
kubectl create secret generic super-agent-console-secret \
  -n default \
  --from-literal=DATABASE_URL='replace-with-real-value' \
  --from-literal=ARK_API_KEY='replace-with-real-value' \
  --from-literal=DEMO_SERVER_TOKEN='replace-with-real-value' \
  --dry-run=client -o yaml | kubectl apply -f -
```

Restart after ConfigMap or Secret changes:

```bash
kubectl rollout restart deployment/my-web-app -n default
kubectl rollout status deployment/my-web-app -n default
```

## CLS Log Collection

Current logging path:

```txt
Nuxt server stdout
→ K3S/containerd node log files
→ Tencent Cloud LogListener
→ CLS log topic
```

Current extraction mode:

```txt
single-line full text
```

This mode is used because container runtime prefixes and framework logs may not be valid JSON for every line.

Useful checks on the server:

```bash
kubectl logs -l app=my-web-app -n default --tail=100
sudo ls -l /var/log/pods
sudo ls -l /var/log/containers
```

Do not print secrets to stdout. Logs should eventually use structured fields such as:

```txt
runId
traceId
eventType
service
env
message
```

## Known Fixes

### Nuxt Static Assets Return 500

Observed error:

```txt
ENOENT: no such file or directory, open '/app/.output/server/chunks/public/_nuxt/xxx.js'
```

Current Dockerfile copies `.output/public` into `.output/server/chunks/public` so Nitro can find generated assets at runtime.

Verify inside the running pod:

```bash
kubectl exec -n default deploy/my-web-app -- ls -l /app/.output/public/_nuxt
kubectl exec -n default deploy/my-web-app -- ls -l /app/.output/server/chunks/public/_nuxt
```
