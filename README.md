# Super Agent Console

AI Agent 执行链路可视化工程 Demo，基于 Nuxt 3、TypeScript、MySQL、Prisma、Docker、K3S 与 JSON stdout 日志。

## Current Status

当前已完成项目骨架：

- Nuxt 3 最小应用结构
- 首页与 Deploy Info 页面
- 基础 Agent UI 组件占位
- `health`、`ready`、`db-check` 服务端接口
- Prisma schema 初版
- 前端与服务端 Agent 开发说明

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

复制 `.env.example` 为 `.env` 后填写本地变量。

生产环境配置优先通过 K3S ConfigMap / Secret 注入，`.env.example` 同时作为配置项说明模板。

K3S 配置示例见 `k8s/configmap.yaml`、`k8s/secret.example.yaml` 和 `docs/k3s-config-secret.md`。
运维层当前基线和排障命令见 `docs/ops-runbook.md`。

## API

- `GET /api/health`
- `GET /api/ready`
- `GET /api/db-check`
- `GET /api/config-demo`
- `POST /api/agent/mock`

## Agent Docs

- `docs/agent-guide/frontend-agent.md`
- `docs/agent-guide/server-agent.md`

## Timeline

项目相关改动统一记录在 `timeline.md`。Git 推送失败、认证检查、重试等过程性操作不记录。
