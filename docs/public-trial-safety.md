# 公网试用与防灾能力说明

本文记录 Super Agent Console 暴露到公网给朋友试用时的主要风险、防护设计和应急操作。

## 当前目标

项目当前不是完全开放注册的生产系统，而是小范围朋友试用版本。公网访问需要做到：

- 只有拿到访问码的人可以进入网站。
- 普通试用用户不能查看全站 Run / Conversation 历史。
- 管理员可以在线上查看全站 Run / Conversation 历史，用于排查和复盘。
- 真实模型调用、服务器资源和数据库写入都有上限保护。
- 发现异常访问或 token 消耗异常时，可以快速关闭模型能力。

## 访问控制

### 普通访问码

`ACCESS_CODES` 用于朋友试用登录。

同一个 access code 可以被多个人同时使用，但它会生成同一个 `userId`，所以这些人共享同一组 Run 频控和并发限制。

如果希望按朋友独立限频，应该给每个人分配不同 access code。

### 管理员访问码

`ADMIN_ACCESS_CODES` 用于管理员登录。

管理员登录后，线上首页会展示：

- Run 列表
- Conversation 列表
- Feedback 列表

普通访问码登录后不会展示这两个入口，直接访问对应页面和 API 也会返回 404。

### 登录昵称

登录页支持填写可选昵称。

昵称不是凭证，不做加密；它存放在已签名的 `sac_auth` payload 里，提交反馈时会写入 `Feedback.nickname`，用于识别反馈来源。

## 频控与并发保护

当前已配置以下保护项：

```env
RUN_RATE_LIMIT_MINUTE=3
RUN_RATE_LIMIT_DAY=30
GLOBAL_RUN_RATE_LIMIT_MINUTE=5
GLOBAL_RUN_RATE_LIMIT_DAY=100
CONCURRENT_RUNS_PER_USER=1
CONCURRENT_RUNS_GLOBAL=3
AUTH_LOGIN_RATE_LIMIT_MINUTE=10
MAX_RUN_INPUT_LENGTH=5000
MODEL_REQUEST_TIMEOUT_MS=60000
```

含义：

- `RUN_RATE_LIMIT_MINUTE`：单个 userId 每分钟最多创建多少个 Run。
- `RUN_RATE_LIMIT_DAY`：单个 userId 每天最多创建多少个 Run。
- `GLOBAL_RUN_RATE_LIMIT_MINUTE`：全站每分钟最多创建多少个 Run。
- `GLOBAL_RUN_RATE_LIMIT_DAY`：全站每天最多创建多少个 Run。
- `CONCURRENT_RUNS_PER_USER`：单个 userId 同时最多运行多少个 SSE Run。
- `CONCURRENT_RUNS_GLOBAL`：全站同时最多运行多少个 SSE Run。
- `AUTH_LOGIN_RATE_LIMIT_MINUTE`：同一 IP 每分钟最多允许多少次登录失败。
- `MAX_RUN_INPUT_LENGTH`：单次输入最大字符数。
- `MODEL_REQUEST_TIMEOUT_MS`：单次模型请求超时时间。

## 模型防灾开关

`MODEL_ENABLED` 是真实模型防灾开关。

```env
MODEL_ENABLED=true
```

正常创建 Run，进入真实模型 / Agent 链路。

```env
MODEL_ENABLED=false
```

网站、登录和反馈仍然可用，但 Run 创建接口会直接返回模型关闭提示，不会创建 Run，不会打开 SSE，也不会消耗真实模型 token。

紧急关闭：

```bash
kubectl patch configmap super-agent-console-config -n default --type merge -p '{"data":{"MODEL_ENABLED":"false"}}'
kubectl rollout restart deployment/my-web-app -n default
```

恢复：

```bash
kubectl patch configmap super-agent-console-config -n default --type merge -p '{"data":{"MODEL_ENABLED":"true"}}'
kubectl rollout restart deployment/my-web-app -n default
```

## K3S 资源限制

应用 Pod 提供资源 requests / limits，避免 Nuxt 应用吃满单节点服务器。

配置文件：

```txt
k8s/deployment-resources-patch.yaml
```

应用命令：

```bash
kubectl patch deployment my-web-app -n default --type='strategic' --patch-file k8s/deployment-resources-patch.yaml
```

当前建议值：

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "768Mi"
```

如果后续并发试用人数增加，需要结合实际 CPU / 内存监控调整。

## 仍需注意的风险

当前防护适合小范围朋友试用，但还不是完整公网产品。

仍需注意：

- access code 被转发后，实际使用人数可能超过预期。
- 频控和并发限制当前是进程内存级别，单 Pod 可用；如果后续扩容多副本，需要改为 Redis 级别。
- AgentEvent、ToolCall、SkillRun 会持续落库，需要后续加数据清理或归档策略。
- CLS 日志、MySQL 数据、Pod 日志都需要关注存储增长。
- 还没有接入完整告警，只能通过 CLS 和服务器资源监控人工观察。

## 建议监控点

CLS 中重点关注：

- `auth_login_failed`
- `agent_run_rate_limited`
- `agent_run_concurrent_limited`
- `agent_run_model_disabled`
- `agent_error`
- 模型供应商请求失败日志

服务器层重点关注：

- CPU
- 内存
- 磁盘
- MySQL Pod 状态
- Nuxt 应用 Pod 重启次数
- LogListener 状态

## 配置变更后检查

应用 ConfigMap / Secret / resources patch 后，执行：

```bash
kubectl rollout restart deployment/my-web-app -n default
kubectl rollout status deployment/my-web-app -n default
kubectl get pods -n default
```

访问网站后，建议做三项人工验证：

1. 普通访问码登录后，可以正常使用 Agent Console，但看不到 Run / Conversation / Feedback 列表入口。
2. 管理员访问码登录后，可以看到 Run / Conversation / Feedback 列表入口。
3. 临时设置 `MODEL_ENABLED=false` 后，点击发送会直接提示模型能力关闭，不会创建新的 Run。
