# Super Agent Console

AI Agent 执行链路可视化工程 Demo，基于 Nuxt 3、TypeScript、MySQL、Prisma、Docker、腾讯云 TKE/CLS 与 TKE Nacos 插件。

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

生产环境配置优先通过腾讯云 TKE 自带 Nacos 插件下发，`.env.example` 同时作为配置项说明模板。

## API

- `GET /api/health`
- `GET /api/ready`
- `GET /api/db-check`

## Agent Docs

- `docs/agent-guide/frontend-agent.md`
- `docs/agent-guide/server-agent.md`

## Timeline

项目执行动作统一记录在 `timeline.md`。
