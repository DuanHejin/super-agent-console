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
