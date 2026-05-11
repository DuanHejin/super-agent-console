# 服务端 Agent 开发说明

## 适用范围

本文档覆盖 Nitro 服务端 API、Agent Runtime 服务、日志、配置和 Prisma 访问。

## 职责边界

- API handler 保持轻量：只做输入解析、响应设置，并调用 service。
- Agent Runtime 主逻辑放在 `server/services/agent-runtime.ts`。
- 关键 AgentEvent 需要同时服务于 SSE、未来数据库记录和 JSON stdout 日志。
- `traceId` 和 `runId` 必须贯穿 API 响应、日志、数据库记录和前端事件。

## 当前入口

- `server/api/health.get.ts`：进程健康检查。
- `server/api/ready.get.ts`：就绪状态 / 配置检查。
- `server/api/db-check.get.ts`：数据库连通性检查。
- `server/api/conversations/messages.post.ts`：创建 conversation message 和 Agent Run，并按 `clientRequestId` 做幂等。
- `server/api/agent/runs/[runId]/events.get.ts`：为已存在的 run 推送 AgentEvent 流。Mock 流式间隔可通过 `intervalMs` 调整，范围限制为 100-5000 ms。
- `server/utils/logger.ts`：JSON 日志。
- `server/utils/prisma.ts`：Prisma client 单例。
- `server/services/*`：Agent、model、tool、prompt 等服务边界。

## 配置规则

- 本地开发读取 `.env`。
- 生产配置优先通过 K3S ConfigMap / Secret 注入。
- 不要打印 API key、数据库密码或完整敏感环境变量值。
- `.env.example` 作为本地开发模板和 K3S 配置映射参考。

## Agent 配置层

- Tool schema、Tool workflow、Skill definition、Model definition 集中放在 `server/agent-config/`。
- 这些文件是未来配置后台的代码优先版本：结构尽量接近可 JSON 序列化的数据，方便后续后台按同样结构存储。
- `server/agent-config/tools.ts` 定义 Tool 名称、描述、参数 schema、启停开关，以及 Tool 使用的 workflow。
- `server/agent-config/skills.ts` 定义 Skill 输入/输出 schema，以及执行该 Skill 的 handlerName。
- `server/agent-config/workflows.ts` 定义 Tool 到 Skill 的编排关系和 `inputMapping`；新增 workflow 应优先加在这里，不要把步骤顺序硬编码进 runtime。
- `server/agent-config/models.ts` 定义可选模型供应商和默认生成参数。
- `server/services/model-adapters/` 是模型集成边界。新增或切换 LLM 供应商时，实现 `ModelAdapter`，不要让 Agent Runtime 直接依赖某个供应商 SDK。
- `server/services/schema-validator.ts` 提供 MVP 阶段的 JSON Schema 校验器，用于 Tool 参数和 Skill 输入/输出。
- `server/services/tool-executor.ts` 校验 Tool 白名单和参数，解析 workflow input mapping，并编排 Skill 执行。
- `server/services/skill-executor.ts` 将 Skill `handlerName` 映射到具体执行函数，并校验 Skill 输入/输出 schema。
- `server/services/workflow-input-mapping.ts` 解析代码配置中的映射表达式，例如 `$toolArgs.jdText` 和 `$steps.extract-requirements.output`。

## MVP Run Store

- `server/services/run-store.ts` 是 MVP 阶段的内存存储，用于 conversation message 创建、Agent Run 记录和 `clientRequestId` 幂等。
- 该存储只用于保持当前接口形态稳定，MVP 阶段暂不引入 NSQ、Redis 和完整数据库持久化。
- 在把 run 状态视为跨进程、多副本可用之前，需要将该服务替换为 Prisma / Redis 存储。

## 修改前检查

- 先阅读 `super_agent_console_codex_requirement.md`。
- 完成有意义的项目改动后，检查并更新 `timeline.md`。
- 服务端改动必须兼容 Docker、K3S 和 JSON stdout 日志。
- Agent runtime 事件必须使用统一 `AgentEvent` 协议，包含 `eventId`、`eventType`、`conversationId`、`messageId`、`runId`、`traceId`、`sequence`、`status`、`timestamp` 和 `data`，方便前端 Timeline、日志和未来数据库记录关联。
- `eventType` 表示“发生了什么”，`status` 表示“当前 Run 处于什么状态”，不要混用。
- Agent 过程必须整体流式展示，不只推最终答案：模型分析使用 `model_text_delta`，Skill 输入放在 `skill_start.data.input`，Skill 输出放在 `skill_result.data.result`，最终答案分片使用 `final_answer_delta`。
