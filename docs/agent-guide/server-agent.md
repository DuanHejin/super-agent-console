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
- `server/api/agent/runs/[runId]/index.get.ts`：查询 Run 详情，用于详情页和后续 replay/trace 能力。
- `server/api/agent/runs/index.get.ts`：查询最近 Run 列表，优先读数据库，失败时回退内存 run-store。
- `server/api/conversations/index.get.ts`：查询 Conversation 列表，优先读数据库，失败时回退内存 run-store。
- `server/utils/logger.ts`：JSON 日志。
- `server/utils/prisma.ts`：Prisma client 单例。
- `server/services/run-persistence.ts`：Prisma 持久化服务，负责将 mock Agent Run、AgentEvent、ToolCall 和 SkillRun 写入数据库。
- `server/services/*`：Agent、model、tool、prompt 等服务边界。
- `prisma/schema.prisma`：MVP 数据模型定义，覆盖 Conversation、Message、AgentRun、AgentEvent、ToolCall、SkillRun 和 IdempotencyRecord。

## 配置规则

- 本地开发读取 `.env.local`，数据库优先连接本机 MySQL。
- `npm run dev` 已通过 `nuxt dev --dotenv .env.local` 显式加载本地环境变量；如果缺少 `DATABASE_URL`，Prisma 落库会失败并回退到内存 run-store。
- 生产配置优先通过 K3S ConfigMap / Secret 注入。
- 线上数据库连接 K3S 内部 MySQL Service：`mysql:3306`。
- 真实模型接入优先使用通用 `MODEL_*` 变量：`MODEL_PROVIDER`、`MODEL_NAME`、`MODEL_BASE_URL`、`MODEL_API_KEY`、`MODEL_TEMPERATURE`、`MODEL_TOP_P`、`MODEL_MAX_TOKENS`。
- 本地接入火山方舟 Seed 2.0 Lite 时，将 `MODEL_PROVIDER` 设置为 `volcengine_ark`，`MODEL_NAME` 设置为方舟 curl 示例中 `model` 字段的值，例如 `doubao-seed-2-0-lite-260428`。
- 不要打印 API key、数据库密码或完整敏感环境变量值。
- `.env.example` 作为本地开发模板和 K3S 配置映射参考，`DATABASE_URL` 示例默认指向本机 MySQL dev 库。

## Agent 配置层

- Tool schema、Tool workflow、Skill definition、Model definition 集中放在 `server/agent-config/`。
- 这些文件是未来配置后台的代码优先版本：结构尽量接近可 JSON 序列化的数据，方便后续后台按同样结构存储。
- `server/agent-config/tools.ts` 定义 Tool 名称、描述、参数 schema、启停开关，以及 Tool 使用的 workflow。
- `server/agent-config/skills.ts` 定义 Skill 输入/输出 schema，以及执行该 Skill 的 handlerName。
- `server/agent-config/workflows.ts` 定义 Tool 到 Skill 的编排关系和 `inputMapping`；新增 workflow 应优先加在这里，不要把步骤顺序硬编码进 runtime。
- `server/agent-config/models.ts` 定义可选模型供应商和默认生成参数。
- `server/services/model-adapters/` 是模型集成边界。新增或切换 LLM 供应商时，实现 `ModelAdapter`，不要让 Agent Runtime 直接依赖某个供应商 SDK。
- `server/services/model-adapters/volcengine-ark-model-adapter.ts` 是火山方舟平台适配器，当前支持 Seed 2.0 Lite 文本流式输出、OpenAI-compatible tools 传参和流式 tool call 解析。
- `server/services/schema-validator.ts` 提供 MVP 阶段的 JSON Schema 校验器，用于 Tool 参数和 Skill 输入/输出。
- `server/services/tool-executor.ts` 校验 Tool 白名单和参数，解析 workflow input mapping，并编排 Skill 执行。
- `server/services/skill-executor.ts` 将 Skill `handlerName` 映射到具体执行函数，并校验 Skill 输入/输出 schema。
- `server/services/workflow-input-mapping.ts` 解析代码配置中的映射表达式，例如 `$toolArgs.jdText` 和 `$steps.extract-requirements.output`。

## 模型平台与模型选择

- 大模型接入需要区分“模型服务平台”和“具体模型”：火山方舟是 MaaS 平台，豆包 Seed、DeepSeek、通义千问、智谱 GLM 等是具体模型或模型家族。
- 当前项目真实模型接入优先使用火山方舟平台，默认评估豆包 Seed 2.0 Lite；如果 tool call、JSON 输出或复杂推理质量不足，再切换 Seed 2.0 Pro 对比。
- Model Adapter 应按平台协议设计，例如 `VolcengineArkAdapter`、`OpenAICompatibleAdapter`、`MockAdapter`；具体模型通过 `MODEL_NAME` 切换。
- 模型平台、模型选择和 Seed 2.0 对比详见 `docs/agent-guide/model-platform-knowledge.md`。

## MVP Run Store 与持久化

- `server/services/run-store.ts` 是 MVP 阶段的内存存储，用于 conversation message 创建、Agent Run 记录和 `clientRequestId` 幂等。
- 该存储会在 SSE 推送过程中实时追加 AgentEvent，方便详情页查询已生成事件。
- `server/services/run-persistence.ts` 会把同一条 mock 链路同步写入 Prisma：创建 Conversation / Message / AgentRun / IdempotencyRecord，推送时写 AgentEvent，并按事件维护 ToolCall / SkillRun。
- Run 详情接口优先读取数据库，读取失败或未命中时回退到内存 run-store。
- 当前仍保留内存 run-store，目的是让 SSE 演示链路在数据库短暂不可用时仍可运行；后续接入 NSQ / Redis 后再替换为更完整的跨进程存储。

## 修改前检查

- 先阅读 `super_agent_console_codex_requirement.md`。
- 完成有意义的项目改动后，检查并更新 `timeline.md`。
- 服务端改动必须兼容 Docker、K3S 和 JSON stdout 日志。
- Agent runtime 事件必须使用统一 `AgentEvent` 协议，包含 `eventId`、`eventType`、`conversationId`、`messageId`、`runId`、`traceId`、`sequence`、`status`、`timestamp` 和 `data`，方便前端 Timeline、日志和未来数据库记录关联。
- `eventType` 表示“发生了什么”，`status` 表示“当前 Run 处于什么状态”，不要混用。
- Agent 过程必须整体流式展示，不只推最终答案：模型分析使用 `model_text_delta`，Tool 中间态输出使用 `tool_progress_delta`，Skill 中间态输出使用 `skill_progress_delta`，Skill 输入放在 `skill_start.data.input`，Skill 输出放在 `skill_result.data.result`，最终答案分片使用 `final_answer_delta`。
- 真实模型 tool call 链路为：首次模型流式请求携带 Tool Schema，并用 `model_call_start.data.phase = tool_planning` 标识工具规划阶段；模型返回 `tool_call` 后推送 `model_tool_call_decision`，再由服务端执行 Tool Router 和 Skill workflow；Skill 当前配置为 `mode: model`，会在 Skill 内部调用模型生成结构化 JSON；最后将 Tool Result 作为 `tool` 消息回填给模型，第二次模型流式请求生成最终答案。
- 模型流式 token 不应逐 token 落成 AgentEvent。服务端需要将 `model_text_delta`、`skill_progress_delta`、`final_answer_delta` 按文本长度或句子边界做批量合并，避免一次 Run 生成过多事件，影响 Run 详情检索和数据库存储。
