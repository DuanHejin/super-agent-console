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

如果香港服务器访问火山方舟北京接口持续不稳定，备选迁移方案见：

```txt
docs/domestic-server-tcr-migration.md
```

该方案将运行节点迁到国内轻量服务器，并把镜像仓库从 GHCR 切到腾讯云 TCR，避免国内 K3S 直接拉取境外 GHCR 镜像。

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
k8s/deployment-resources-patch.yaml
```

ConfigMap holds non-sensitive values.

Secret holds sensitive values. Do not commit real Secret values.

Apply/update ConfigMap:

```bash
kubectl apply -f k8s/configmap.yaml
```

Emergency stop real model calls:

```bash
kubectl patch configmap super-agent-console-config -n default --type merge -p '{"data":{"MODEL_ENABLED":"false"}}'
kubectl rollout restart deployment/my-web-app -n default
```

Restore model calls:

```bash
kubectl patch configmap super-agent-console-config -n default --type merge -p '{"data":{"MODEL_ENABLED":"true"}}'
kubectl rollout restart deployment/my-web-app -n default
```

Check runtime config without exposing secrets:

```bash
kubectl exec -n default deploy/my-web-app -- node -e "fetch('http://127.0.0.1:3000/api/ready').then(r=>r.text()).then(console.log)"
```

Create/update real Secret on the server:

```bash
kubectl create secret generic super-agent-console-secret \
  -n default \
  --from-literal=DATABASE_URL='replace-with-real-value' \
  --from-literal=MODEL_API_KEY='replace-with-real-value' \
  --from-literal=ACCESS_CODES='replace-with-real-value' \
  --from-literal=ADMIN_ACCESS_CODES='replace-with-real-value' \
  --from-literal=AUTH_COOKIE_SECRET='replace-with-real-value' \
  --from-literal=DEMO_SERVER_TOKEN='replace-with-real-value' \
  --dry-run=client -o yaml | kubectl apply -f -
```

Restart after ConfigMap or Secret changes:

```bash
kubectl rollout restart deployment/my-web-app -n default
kubectl rollout status deployment/my-web-app -n default
```

Apply resource requests / limits:

```bash
kubectl patch deployment my-web-app -n default --type='strategic' --patch-file k8s/deployment-resources-patch.yaml
```

## MySQL

MVP 阶段的数据库策略：

```txt
本地开发：本机 MySQL 8.0
线上运行：K3S 自建单节点 MySQL 8.0
临时排查：必要时通过 SSH + kubectl 双层转发连接 K3S MySQL
```

部署和开发说明见：

```txt
docs/k3s-mysql.md
```

K3S MySQL 不配置 Ingress，不对公网暴露。线上应用通过 K3S 内部 Service `mysql:3306` 访问；本地开发优先连接本机 MySQL。表结构通过 Prisma migration 文件同步到线上。

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
sequence
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
