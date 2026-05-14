# 国内轻量服务器 + TCR 迁移预案

## 背景

当前线上链路运行在腾讯云中国香港轻量应用服务器：

```txt
GitHub Actions
→ build Docker image
→ push GHCR
→ SSH 到香港 K3S
→ K3S 从 GHCR 拉镜像
→ 应用访问火山方舟北京接口
```

实际验证后发现，香港服务器访问火山方舟北京接口存在明显不稳定：同样的 Chat API 请求，本地较稳定，但香港服务器上可能首包很慢、偶发失败或触发模型请求超时。

备选方案是把运行节点迁到中国大陆，例如南京轻量应用服务器，并把镜像仓库从 GHCR 切到腾讯云 TCR，降低两条链路的不确定性：

```txt
国内 K3S → 火山方舟北京接口
国内 K3S → 腾讯云 TCR 镜像仓库
```

## 目标架构

```txt
Browser
→ 已备案域名
→ 国内轻量应用服务器
→ K3S Traefik Ingress
→ my-web-svc
→ my-web-app
→ K3S MySQL
→ 火山方舟北京 API

GitHub Actions
→ build Docker image
→ push 腾讯云 TCR
→ SSH 到国内 K3S
→ kubectl set image
→ rollout status
```

## 核心结论

- TCR 是独立的容器镜像仓库服务，不绑定 TKE。
- TKE 不能使用轻量应用服务器作为节点，但自建 K3S 可以从 TCR 拉取镜像。
- GitHub Actions 可以继续作为 CI/CD 入口，只是把镜像推送目标从 GHCR 换成 TCR。
- 国内服务器访问火山方舟北京接口大概率比香港稳定，但域名正式访问需要 ICP 备案。
- 迁移时不要直接停掉香港环境，先搭建国内平行环境，验证通过后再切 DNS。

## 迁移范围

需要迁移：

- K3S 基础环境
- Traefik Ingress / cert-manager / HTTPS
- MySQL 数据库和 Prisma 表结构
- ConfigMap / Secret
- 应用 Deployment / Service / Ingress
- 镜像仓库从 GHCR 切到 TCR
- GitHub Actions SSH 目标
- CLS LogListener 和机器组

不建议迁移：

- 香港服务器整机磁盘
- K3S 内部 PVC 原始目录
- 真实 Secret 文件
- kubeconfig / 私钥等本地敏感配置

数据库用 `mysqldump` 迁移，配置用命令重新创建。

## 阶段一：购买国内服务器

推荐先按当前规格平移：

```txt
地域：南京 / 上海 / 北京
规格：2 核 2G
系统盘：40GB SSD
系统：Ubuntu 22.04 LTS
带宽：至少 2Mbps，预算允许优先 4Mbps / 5Mbps
```

注意：

- 2Mbps 对 SSE 文本流和少量朋友内测基本够用。
- 首屏 JS、Docker 镜像拉取、多人同时访问会受带宽影响。
- 如果长期公开访问，优先提高带宽，再考虑 CDN。

## 阶段二：备案准备

国内服务器绑定域名正式访问前，需要完成 ICP 备案。

建议备案口径保持个人学习项目：

```txt
个人 AI 应用开发实践
AI 求职准备工具演示
个人技术学习记录
```

避免描述成：

```txt
商业 AI 平台
在线招聘服务
付费咨询平台
开放社区 / 论坛
```

备案通过前，不建议把正式域名直接解析到国内服务器。可以先用本机 `hosts` 临时指向新服务器公网 IP 做自测。

## 阶段三：新服务器初始化

在国内服务器上完成：

```bash
apt update
apt install -y curl vim git
```

安装 K3S：

```bash
curl -sfL https://get.k3s.io | sh -
kubectl get nodes
kubectl get pods -A
```

打开腾讯云防火墙：

```txt
22/tcp   SSH
80/tcp   HTTP
443/tcp  HTTPS
```

如果继续使用 K3S 默认 Traefik，确认：

```bash
kubectl get svc -n kube-system traefik
kubectl get pods -n kube-system | grep traefik
```

## 阶段四：配置 TCR

前期建议先用 TCR 个人版，成本和操作都更轻。后续如果需要更强的权限控制、实例级网络访问控制、跨地域同步，再考虑企业版。

个人版常见镜像地址格式：

```txt
ccr.ccs.tencentyun.com/<namespace>/<repo>:<tag>
```

示例规划：

```txt
namespace: dhj-agent
repo: super-agent-console
image: ccr.ccs.tencentyun.com/dhj-agent/super-agent-console:0.1.0
```

在腾讯云控制台完成：

1. 开通容器镜像服务 TCR。
2. 初始化个人版服务。
3. 创建命名空间，例如 `dhj-agent`。
4. 创建镜像仓库，例如 `super-agent-console`。
5. 获取登录用户名和密码。

本地或 GitHub Actions 中的 Docker 登录命令形态：

```bash
docker login ccr.ccs.tencentyun.com \
  --username='<TCR_USERNAME>' \
  --password='<TCR_PASSWORD>'
```

K3S 拉取私有镜像需要创建 `imagePullSecret`：

```bash
kubectl create secret docker-registry tcr-secret \
  --docker-server=ccr.ccs.tencentyun.com \
  --docker-username='<TCR_USERNAME>' \
  --docker-password='<TCR_PASSWORD>' \
  -n default
```

给 Deployment 绑定：

```bash
kubectl patch deployment my-web-app -n default \
  -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"tcr-secret"}]}}}}'
```

## 阶段五：调整 GitHub Actions

当前 workflow 位于：

```txt
.github/workflows/release-docker-k3s.yml
```

当前构建脚本已经支持通过环境变量改镜像仓库：

```txt
IMAGE_REGISTRY
IMAGE_OWNER
IMAGE_NAME
```

但当前脚本的“自动读取远端最大 tag”仍依赖 GHCR API，所以正式切换 TCR 前有两种做法。

### 方案 A：短期保守方案

继续用 GHCR 计算版本号，但把最终镜像推送到 TCR。

适合迁移早期，改动少，但语义不够干净。

GitHub Actions 里新增 Secrets：

```txt
TCR_USERNAME
TCR_PASSWORD
K3S_SSH_HOST          # 改成国内服务器 IP
K3S_SSH_PORT
K3S_SSH_USER
K3S_SSH_PRIVATE_KEY
```

构建步骤改为：

```bash
IMAGE_REGISTRY=ccr.ccs.tencentyun.com \
IMAGE_OWNER=dhj-agent \
IMAGE_NAME=super-agent-console \
GITHUB_TOKEN="${GHCR_TOKEN}" \
GITHUB_USERNAME="${TCR_USERNAME}" \
./scripts/build-and-push-ghcr.sh
```

注意：这个方案里变量名 `GITHUB_USERNAME` / `GITHUB_TOKEN` 会被复用为 docker login 用户名和密码，后续应重构为通用的 `REGISTRY_USERNAME` / `REGISTRY_PASSWORD`。

### 方案 B：推荐正式方案

新增或重构脚本：

```txt
scripts/build-and-push-image.sh
```

使用通用变量：

```txt
IMAGE_REGISTRY=ccr.ccs.tencentyun.com
IMAGE_OWNER=dhj-agent
IMAGE_NAME=super-agent-console
REGISTRY_USERNAME=<TCR_USERNAME>
REGISTRY_PASSWORD=<TCR_PASSWORD>
IMAGE_TAG=<本次版本号>
```

版本号来源改成下面二选一：

- GitHub Actions run number，例如 `0.1.${{ github.run_number }}`。
- 继续维护 semver，但从 Git tag 或仓库文件读取，不再依赖 GHCR API。

正式迁移时推荐做方案 B，这样 GHCR 和 TCR 解耦。

## 阶段六：部署 K3S 应用

先创建 ConfigMap：

```bash
kubectl apply -f k8s/configmap.yaml
```

国内服务器上建议调整：

```txt
NUXT_PUBLIC_SITE_URL=https://你的备案域名
MODEL_REQUEST_TIMEOUT_MS=180000
MODEL_PROVIDER=volcengine_ark
MODEL_ENABLED=true
```

创建 Secret，敏感值只在服务器上执行，不写入仓库：

```bash
kubectl create secret generic super-agent-console-secret \
  -n default \
  --from-literal=DATABASE_URL='mysql://sac_app:<MYSQL_APP_PASSWORD>@mysql:3306/super_agent_console_prod' \
  --from-literal=MODEL_API_KEY='<VOLCENGINE_ARK_API_KEY>' \
  --from-literal=ACCESS_CODES='<FRIEND_CODES>' \
  --from-literal=ADMIN_ACCESS_CODES='<ADMIN_CODES>' \
  --from-literal=AUTH_COOKIE_SECRET='<LONG_RANDOM_SECRET>' \
  --from-literal=DEMO_SERVER_TOKEN='<DEMO_SERVER_TOKEN>' \
  --dry-run=client -o yaml | kubectl apply -f -
```

部署或更新镜像：

```bash
kubectl set image deployment/my-web-app \
  my-web-app=ccr.ccs.tencentyun.com/dhj-agent/super-agent-console:<IMAGE_TAG> \
  -n default

kubectl rollout status deployment/my-web-app -n default
```

确认 Service 和 Ingress：

```bash
kubectl get svc my-web-svc -n default -o yaml
kubectl get ingress -n default
```

Ingress backend port 应填写 Service port，不是容器端口。容器端口仍是 `3000`。

## 阶段七：迁移 MySQL 数据

旧香港服务器导出：

```bash
kubectl exec -n default deploy/mysql -- \
  mysqldump -u root -p super_agent_console_prod > super_agent_console_prod.sql
```

如果 MySQL 不是 Deployment 名称 `mysql`，先查询：

```bash
kubectl get pods -n default | grep mysql
kubectl get deploy -n default
```

新国内服务器先部署 MySQL，再执行 Prisma migration：

```bash
npx prisma migrate deploy
```

导入旧数据：

```bash
kubectl cp super_agent_console_prod.sql default/<MYSQL_POD_NAME>:/tmp/super_agent_console_prod.sql

kubectl exec -n default <MYSQL_POD_NAME> -- \
  mysql -u root -p super_agent_console_prod < /tmp/super_agent_console_prod.sql
```

如果 shell 重定向在 `kubectl exec` 中不好用，可以进入 Pod 后手动执行：

```bash
kubectl exec -it -n default <MYSQL_POD_NAME> -- bash
mysql -u root -p super_agent_console_prod < /tmp/super_agent_console_prod.sql
```

## 阶段八：HTTPS 与域名切换

国内服务器验证链路时，先不要切正式 DNS。

本机 `hosts` 临时验证：

```txt
<NEW_SERVER_PUBLIC_IP> dhjin.top
```

验证内容：

```bash
curl -Iv http://dhjin.top
curl -Iv https://dhjin.top
```

确认：

- 登录访问码可用。
- Cookie 在 HTTPS 下正常发送。
- 反馈提交和管理员查看可用。
- Run 创建可用。
- CLS 能看到 `agent_start`、`model_call_start`、`agent_done`。
- 真实模型请求不再频繁触发 `isTimeout=true`。

确认后再切 DNS A 记录到新服务器公网 IP。

## 阶段九：迁移 CLS

新服务器需要重新安装腾讯云 LogListener：

1. 在腾讯云 CLS 控制台把新服务器加入机器组。
2. 在新服务器安装并初始化 LogListener。
3. 采集路径继续指向 K3S 容器日志目录，例如 `/var/log/containers/*.log`。
4. 提取模式保持“单行全文”。
5. 在 CLS 中按 `runId`、`traceId`、`eventType` 检索验证。

旧香港服务器确认不再承载流量后，再从机器组中移除。

## 回滚方案

迁移完成前，香港服务器保持运行。

如果国内环境异常：

1. DNS 切回香港服务器公网 IP。
2. GitHub Actions 的 `K3S_SSH_HOST` 改回香港服务器。
3. 镜像仓库可以临时切回 GHCR。
4. 国内环境保留排查，不影响朋友继续访问旧环境。

## 验收清单

- [ ] 国内服务器 K3S 节点 Ready。
- [ ] Traefik Ingress 可访问。
- [ ] cert-manager 证书签发成功。
- [ ] MySQL Pod 和 Service 正常。
- [ ] Prisma migration 已执行。
- [ ] 旧数据已导入新 MySQL。
- [ ] TCR 镜像可 push。
- [ ] K3S 可从 TCR pull 私有镜像。
- [ ] ConfigMap / Secret 已重新创建。
- [ ] `/api/ready` 返回配置加载状态正常。
- [ ] 登录、反馈、管理员页面正常。
- [ ] Agent Run 可完成。
- [ ] CLS 能检索新服务器日志。
- [ ] DNS 已切换。
- [ ] 旧香港服务器保留至少 1-3 天观察。

## 参考资料

- [腾讯云容器镜像服务个人版快速入门](https://cloud.tencent.com/document/product/1141/63910)
- [腾讯云容器镜像服务个人版说明](https://cloud.tencent.com/document/product/1141/57780)
- [腾讯云容器镜像服务产品页](https://cloud.tencent.com/product/tcr)
- [个人版迁移至企业版完全指南](https://cloud.tencent.com/document/product/1141/52292)
