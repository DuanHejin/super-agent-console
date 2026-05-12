# Super Agent Console Timeline

本文件用于记录项目执行周期内的项目相关改动。按日期维度维护，整个项目只使用这一份 timeline 文件。

记录范围：

- 记录需求、架构、代码、配置、部署方案、文档等会影响项目本身的改动。
- 不记录 Git 推送失败、认证检查、网络重试、命令超时等过程性操作。

## 2026-05-06

- 阅读 `super_agent_console_codex_requirement.md`，确认项目目标是 Nuxt 3 全栈 AI Agent 工程化 Demo，覆盖 SSE、Agent Timeline、数据库落库、JSON 日志、Docker、Kubernetes 部署等主链路。
- 将生产环境部署计划调整为香港轻量应用服务器单节点 K3S，生产配置通过 K3S ConfigMap / Secret 注入，同时保留 `.env.example` 作为本地开发和配置说明模板。
- 将项目执行顺序调整为允许先搭建域名和香港服务器的网站访问层，再继续推进 Nuxt 应用和 Agent 代码实现。
- 新增项目级执行记录要求：后续项目相关改动记录在根目录 `timeline.md` 中，并按日期归档；Git 推送失败、认证检查、网络重试等过程性操作不记录。
- 开始 Step 1 项目骨架搭建，创建 Nuxt 3 最小应用结构、基础页面、组件目录、组合式函数目录、server API 目录、Prisma 目录、K8s 目录和 docs 目录。
- 新增 `docs/agent-guide/frontend-agent.md` 与 `docs/agent-guide/server-agent.md`，记录前端和服务端 Agent 开发边界、入口文件和注意事项。
- 执行 `npm install` 时发现当前 Node v18.20.8 不满足 Nuxt 依赖要求，补充 `.nvmrc` 和 `package.json engines`，要求 Node >=20.19.0。
- 安装 Node v22.22.2 后重新执行 `npm install` 成功，`nuxt prepare` 正常生成类型文件。
- 执行 `npm run build` 验证 Nuxt 项目骨架，生产构建成功。
- 安装原生 arm64 Docker CLI 与 Colima，建立本地 Docker 打包环境。
- 新增 `Dockerfile` 与 `.dockerignore`，用于构建 Nuxt 3 生产镜像并运行 `.output/server/index.mjs`。
- 本地成功构建 `linux/amd64` Docker 镜像 `super-agent-console:0.1.0`，并导出为 `/private/tmp/super-agent-console-0.1.0-linux-amd64.tar`，用于导入香港服务器 K3S。
- 将镜像推送到 GitHub Container Registry：`ghcr.io/duanhejin/super-agent-console:0.1.0` 与 `ghcr.io/duanhejin/super-agent-console:latest`。
- 新增 `docs/deploy-ghcr-k3s.md` 和 `scripts/build-and-push-ghcr.sh`，沉淀 Docker build、GHCR push 与 K3S 拉取镜像部署流程。
- 更新 GHCR 构建推送脚本的版本策略：默认从 GHCR 最大 semver tag 自动递增 patch，patch 达到 `99` 后进位到下一个 minor 版本。
- 新增 GitHub Actions release workflow：代码推送到 `release` 分支时自动构建 Docker 镜像、推送 GHCR，并通过 SSH 触发 K3S Deployment 滚动更新。
- 更新 K3S CI/CD 配置中的 Service 名称为 `my-web-svc`。
- 更新首页部署文案，明确展示 GitHub Actions、GHCR 与香港服务器 K3S 的发布链路。
- 新增项目级 skill `.agents/skills/github-pr-release`，沉淀从任意开发分支创建 PR、review、merge 到 `release` 并触发 CI/CD 的操作流程。
- 新增 K3S ConfigMap / Secret demo 配置、部署说明和浏览器端非敏感 runtimeConfig 读取示例，用于验证生产环境配置注入链路。
- 修复 Nuxt Docker 镜像中的静态资源布局，将 `.output/public` 同步到 Nitro runtime 查找的 `.output/server/chunks/public`，避免线上 `/_nuxt/*.js` 资源 500。
- 新增 `docs/ops-runbook.md`，沉淀 K3S 资源、release 发布流程、GHCR 拉取、ConfigMap / Secret、CLS 日志采集与 Nuxt 静态资源排障基线。
- 实现 Mock Agent 主流程：新增服务端 Mock Run 接口，生成 runId、traceId、事件列表和最终输出，并在首页 Agent Console 中展示输入、Timeline、输出与运行元信息。
- 新增 `POST /api/agent/run` SSE 流式接口，并让前端 Agent Console 通过浏览器 fetch 逐步消费 AgentEvent，实时更新 Timeline 与输出区。
- 统一 AgentEvent 协议字段为 `eventType`、`runId`、`traceId`、`sequence`、`timestamp`，并将 SSE 推送事件同步输出为结构化 JSON 日志，方便后续 CLS 检索和数据库落库。

## 2026-05-11

- 新增三阶段 Agent 架构实施计划：MVP 核心链路、进阶运行能力、高阶平台能力，分别记录在 `docs/plans/mvp-agent-core-plan.md`、`docs/plans/advanced-agent-runtime-plan.md`、`docs/plans/platform-agent-capability-plan.md`，后续按 checklist 勾选推进。
- 新增 Agent 配置化基础：用 TS 集中定义 Tool Schema、Skill Definition、Tool Workflow 和 Model 配置，并新增 mock / doubao 模型适配器骨架，为后续配置后台和真实模型接入预留扩展边界。
- 新增 MVP 双接口链路：`POST /api/conversations/messages` 创建 conversation / message / run 并按 `clientRequestId` 做幂等，`GET /api/agent/runs/:runId/events` 基于 `runId` 推送 SSE；前端发送流程同步调整为先创建 Run 再订阅事件流。
- 统一 AgentEvent MVP 协议，新增 `eventId`、`status`、`data` 等标准字段，并引入 Agent Run 状态机校验，明确区分事件类型与运行状态。
- 补齐 Agent 全过程流式展示：模型分析阶段通过 `model_text_delta` 推送，Tool 调用、Skill 输入、Skill 结果和最终答案均通过 AgentEvent 实时展示到前端。
- 新增 Mock SSE 推送间隔配置：服务端支持 `intervalMs` query，前端可通过页面 `sseIntervalMs` query 或 `agent:sseIntervalMs` localStorage 调整演示速度。
- 新增通用打字机队列 composable，将模型分析流和最终答案流从“整段追加”改为字符级渐进展示。
- 新增前端运行中 loading 交互，在 AI Output 和 Timeline 中提示当前 Agent Run 仍在执行。
- 接入 Tool Router、轻量 JSON Schema 校验、workflow input mapping 和 Skill Executor，`analyzeJobAndGeneratePlan` Tool 已按配置编排两个 Skill 并产出实时 AgentEvent。
- 补充 Agent 配置类型、运行状态、事件协议、Tool/Skill 执行链路等核心类型与方法注释，方便后续复盘和扩展配置后台。
- 新增 Run 详情查询接口和 `/runs/:runId` 页面，支持从首页跳转查看用户输入、运行状态、AgentEvent、Tool / Skill 过程和最终答案。
- 新增 Tool / Skill 过程展示面板，将 AgentEvent 中的 Tool 参数、Skill 输入输出和 Tool 返回转换为可读 UI，避免前端只能等待最终答案。

## 2026-05-12

- 新增 `tool_progress_delta` 和 `skill_progress_delta` 事件，让 Tool 编排层和 Skill handler 的中间态输出也能通过 SSE 实时展示到 Timeline、过程卡片和 Run 详情页。
