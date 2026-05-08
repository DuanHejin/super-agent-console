# GHCR 镜像构建与 K3S 部署

本文记录 Super Agent Console 的镜像发布流程：

```txt
本地 Docker build
→ 登录 GitHub Container Registry
→ tag 镜像
→ push 到 GHCR
→ K3S Deployment 拉取镜像
→ 更新 Service targetPort
```

## 前置条件

本机需要：

- Docker CLI
- 可用的 Docker daemon，例如 Colima 或 Docker Desktop
- GitHub token，至少包含：
  - `write:packages`，用于 push 镜像
  - `read:packages`，用于 K3S 拉取私有 GHCR 镜像

当前镜像地址：

```txt
ghcr.io/duanhejin/super-agent-console
```

默认版本策略：

```txt
脚本自动递增 semver patch 版本。
```

规则：

- 默认查询 GHCR 中已有的最大 semver tag，例如 `0.1.8`。
- 下一次构建自动使用 `0.1.9`。
- patch 最大值为 `99`。
- 如果当前最大 tag 是 `0.1.99`，下一次自动变成 `0.2.0`。
- 如果 GHCR 中没有 semver tag，则读取 `package.json` 的 `version`，并构建下一个 patch 版本。
- 如果需要固定版本，可以用 `IMAGE_TAG` 手动覆盖。

默认平台：

```txt
linux/amd64
```

如果服务器是 ARM 架构，将平台改成 `linux/arm64`。

## 本地构建并推送

不要把 GitHub token 写入脚本或提交到仓库。使用环境变量传入：

```bash
export GITHUB_TOKEN=你的_github_token
```

如果需要代理：

```bash
export https_proxy=http://127.0.0.1:7897
export http_proxy=http://127.0.0.1:7897
export all_proxy=socks5://127.0.0.1:7897
```

执行脚本：

```bash
./scripts/build-and-push-ghcr.sh
```

脚本会自动选择下一个版本。自定义版本：

```bash
IMAGE_TAG=0.1.1 ./scripts/build-and-push-ghcr.sh
```

自定义平台：

```bash
IMAGE_PLATFORM=linux/arm64 ./scripts/build-and-push-ghcr.sh
```

脚本会推送两个 tag：

```txt
ghcr.io/duanhejin/super-agent-console:${IMAGE_TAG}
ghcr.io/duanhejin/super-agent-console:latest
```

## K3S 拉取私有 GHCR 镜像

当前 GHCR package 是 private，所以 K3S 需要 `imagePullSecret`。

在服务器上执行：

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=DuanHejin \
  --docker-password='你的_github_token_需要_read_packages' \
  -n default
```

如果 secret 已存在，需要先更新：

```bash
kubectl delete secret ghcr-secret -n default
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=DuanHejin \
  --docker-password='你的_github_token_需要_read_packages' \
  -n default
```

给 Deployment 绑定 imagePullSecret：

```bash
kubectl patch deployment my-web-app -n default \
  -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr-secret"}]}}}}'
```

## GitHub Actions CI/CD

仓库提供 release 分支自动发布 workflow：

```txt
.github/workflows/release-docker-k3s.yml
```

触发条件：

```txt
push 到 release 分支
手动 workflow_dispatch
```

流程：

```txt
checkout
→ 执行 scripts/build-and-push-ghcr.sh
→ 自动递增镜像 tag
→ push 到 GHCR
→ SSH 到 K3S 服务器
→ kubectl set image
→ kubectl rollout status
```

需要在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

```txt
GHCR_TOKEN             # GitHub PAT，建议包含 read:packages 和 write:packages
K3S_SSH_HOST           # 香港服务器 IP 或域名
K3S_SSH_PORT           # SSH 端口，可选，默认 22
K3S_SSH_USER           # SSH 用户，例如 root
K3S_SSH_PRIVATE_KEY    # 用于登录服务器的私钥
```

workflow 默认 K3S 资源：

```txt
namespace: default
deployment: my-web-app
container: my-web-app
service: my-web-svc
containerPort: 3000
```

如果后续资源名变化，修改 workflow 顶部的 `env` 即可。

注意：

- workflow 优先使用 `GHCR_TOKEN` 推送 GHCR；如果没有配置，会退回 GitHub Actions 内置 `GITHUB_TOKEN`。
- 为了让自动递增版本号能稳定查询 GHCR 已有 tag，建议配置 `GHCR_TOKEN`。
- GHCR package 仍是 private 时，K3S 服务器必须提前配置 `ghcr-secret`。
- 服务器上执行 CI/CD 的 SSH 用户需要能运行 `kubectl`。
- 如果服务器上的命令是 `k3s kubectl` 而不是 `kubectl`，需要在服务器上配置 alias/symlink，或修改 workflow 中的命令。

## 更新 K3S Deployment 镜像

当前 demo Deployment 信息：

```txt
namespace: default
deployment: my-web-app
container: my-web-app
service: my-web-svc
```

更新镜像：

```bash
kubectl set image deployment/my-web-app \
  my-web-app=ghcr.io/duanhejin/super-agent-console:0.1.0 \
  -n default
```

Nuxt 容器监听 `3000`，nginx demo 通常监听 `80`，所以需要确认并修改端口。

查看当前配置：

```bash
kubectl get deployment my-web-app -n default -o yaml
kubectl get svc my-web-svc -n default -o yaml
```

将 Deployment containerPort 改成 `3000`：

```bash
kubectl patch deployment my-web-app -n default --type='json' \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/ports/0/containerPort","value":3000}]'
```

将 Service targetPort 改成 `3000`：

```bash
kubectl patch svc my-web-svc -n default --type='json' \
  -p='[{"op":"replace","path":"/spec/ports/0/targetPort","value":3000}]'
```

观察发布状态：

```bash
kubectl rollout status deployment/my-web-app -n default
kubectl get pods -n default
kubectl logs -l app=my-web-app -n default --tail=100
```

如果 Service selector 不是 `app=my-web-app`，用实际 label 查询日志：

```bash
kubectl get pods -n default --show-labels
```

## 常见问题

### GHCR push 权限不足

错误示例：

```txt
permission_denied: The token provided does not match expected scopes
```

处理方式：

```bash
gh auth refresh -h github.com -s write:packages
```

或者使用包含 `write:packages` 的 GitHub token 设置 `GITHUB_TOKEN`。

### K3S ImagePullBackOff

检查：

```bash
kubectl describe pod POD_NAME -n default
```

常见原因：

- `imagePullSecret` 未绑定到 Deployment。
- GitHub token 缺少 `read:packages`。
- 镜像 tag 写错。
- 服务器无法访问 `ghcr.io`。

### 访问后 502 或端口不通

确认：

- Deployment `containerPort` 是 `3000`。
- Service `targetPort` 是 `3000`。
- Ingress 指向的 Service port 与 Service 定义一致。

### `/_nuxt/*.js` 返回 500

错误示例：

```txt
ENOENT: no such file or directory, open '/app/.output/server/chunks/public/_nuxt/xxx.js'
```

这是 Nuxt/Nitro 静态资源路径问题。当前 Dockerfile 会把 `.output/public` 同步到 `.output/server/chunks/public`，用于匹配 Nitro runtime 的静态资源索引。

验证镜像内资源：

```bash
kubectl exec -n default deploy/my-web-app -- ls -l /app/.output/public/_nuxt
kubectl exec -n default deploy/my-web-app -- ls -l /app/.output/server/chunks/public/_nuxt
```
