# Super Agent Console

AI Agent 执行链路可视化工程 Demo，基于 Nuxt 3、TypeScript、MySQL、Prisma、Docker、K3S 与 JSON stdout 日志。

## Current Status

当前已完成轻量版 Agent Console 主链路：

- 访问码登录、Run 创建频控和输入长度限制
- Nuxt 3 Agent Console、Conversation 列表、Run 列表和 Run 详情页
- 创建消息 / 创建 Run 与 SSE 订阅双接口链路
- 火山方舟 Seed 2.0 Lite 流式模型输出、tool call、Tool Router 和 Skill 编排
- MySQL / Prisma 持久化 Conversation、Message、AgentRun、AgentEvent、ToolCall、SkillRun 和 Feedback
- Docker、GHCR、GitHub Actions、K3S 发布链路

## Development

Use Node.js `>=20.19.0`. This repo includes `.nvmrc` set to Node 22.

```bash
nvm use
npm install
npm run dev
```

默认本地地址：

```txt
http://localhost:3000
```

## Environment

复制 `.env.example` 为 `.env.local` 后填写本地变量。

生产环境配置优先通过 K3S ConfigMap / Secret 注入，`.env.example` 同时作为配置项说明模板。

K3S 配置示例见 `k8s/configmap.yaml`、`k8s/secret.example.yaml` 和 `docs/k3s-config-secret.md`。
运维层当前基线和排障命令见 `docs/ops-runbook.md`。
公网试用与防灾能力说明见 `docs/public-trial-safety.md`。

## API

- `GET /api/health`
- `GET /api/ready`
- `GET /api/db-check`
- `GET /api/config-demo`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/conversations/messages`
- `GET /api/conversations`
- `GET /api/agent/runs`
- `GET /api/agent/runs/:runId`
- `GET /api/agent/runs/:runId/events`，SSE event stream
- `POST /api/feedback`

## Agent Docs

- `docs/agent-guide/frontend-agent.md`
- `docs/agent-guide/server-agent.md`

## Timeline

项目相关改动统一记录在 `timeline.md`。Git 推送失败、认证检查、重试等过程性操作不记录。
