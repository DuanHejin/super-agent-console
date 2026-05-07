# AGENTS.md — 仓库入口

> 适用范围：仓库根目录
> 权威级别：主文档

本仓库以 `AGENTS.md` 为主文档。任何 Agent 进入仓库后，先读本文件，再进入对应子项目文档。

## 仓库结构

```text
super-agent-console/
├── pages/                 # Nuxt 页面
├── components/            # Vue 组件
├── composables/           # 前端组合式状态与请求逻辑
├── server/                # Nitro API、服务端工具与 Agent Runtime
├── prisma/                # Prisma schema
├── k8s/                   # Kubernetes 部署文件
├── docs/agent-guide/      # Agent 开发说明
├── .agents/skills/        # 仓库内项目级 Codex skills
├── timeline.md            # 项目执行记录
└── super_agent_console_codex_requirement.md
```

## 阅读顺序

1. 先读本文件，确定任务属于哪个子项目。
2. 前端任务读 `docs/agent-guide/frontend-agent.md`。
3. 服务端任务读 `docs/agent-guide/server-agent.md`。
4. 涉及整体目标、验收标准、部署链路时读 `super_agent_console_codex_requirement.md`。
5. 完成项目相关改动后，按日期更新 `timeline.md`；Git 推送失败、认证检查、重试等过程性操作不记录。
6. 涉及 PR 创建、review、merge、release 分支发布时使用 `.agents/skills/github-pr-release/SKILL.md`。

> 不要在未阅读对应子项目文档前直接修改代码。

## 主文档与兼容文档

- `AGENTS.md` 是主入口、主规则、主事实源。

## 文档分层规则

- 根 `AGENTS.md`：仓库入口、任务路由、跨端规则、文档治理规则。
- 子项目 `AGENTS.md`：该端开发规范、常用流程、任务入口、检查清单。
- `docs/agent-guide/`：当前有效的模块知识、调试路径、踩坑说明。

## 文档更新规则

发生以下情况时，必须同步更新文档：

- 修改某个模块的真实行为、协议、数据流、关键约束：更新对应 `docs/agent-guide/*.md`。
- 解决一个可复发的问题或新踩坑：更新对应 `gotchas.md`。
- 完成复杂设计或专项实现：补充到对应 `docs/plans/`。

如果本次改动不需要更新文档，必须能说明原因。

任务完成说明中，应显式标注以下其一：

- `Docs: updated`
- `Docs: not needed, because ...`

## Commit 规范

- 仓库统一采用 Angular 风格的 commit message 规范：`<type>(<scope>): <subject>`
- `type` 必填，使用小写英文；允许值：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`
- `scope` 可选，建议填写实际模块名，例如 `chat`、`conversation`、`payment`、`frontend`、`backend`
- `subject` 必填，使用英文，简短明确，不加句号
- 首行建议不超过 72 个字符；一条提交只表达一个意图
- 破坏性变更使用 `!` 或 `BREAKING CHANGE:` 标记，例如：`feat(api)!: change conversation history response format`

示例：

- `feat(chat): return sse max offset in chat response`
- `fix(sse): preserve offset during history reconnect`
- `docs(agent): document repository commit convention`
