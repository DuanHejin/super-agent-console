# Super Agent Console Demo 面试介绍

## 一句话介绍

Super Agent Console 是我基于 Nuxt 3、TypeScript、MySQL、Prisma、Docker、K3S 和真实大模型能力搭建的 AI Agent 工程化 Demo。

它不是一个普通聊天框，而是围绕“Agent 一次任务从创建、执行、工具调用、流式输出、落库、复盘到线上部署”的完整链路做的实践项目。

我做这个项目的目的，是把之前在公司 AI 内容创作平台中接触到的 Agent 架构能力，用一个自己完全可控的项目重新实现一遍，并补齐服务端、部署、日志、数据库和线上运维这部分能力。

## 项目背景

我之前主要是前端和多端开发背景，做过 React Native、Vue、React、Nuxt、小程序、鸿蒙、Node.js 中间件和内容编辑器相关项目。

最近一份工作里，我参与过 PagePop 这类 AI 内容创作平台，接触过 AI 对话生成、流式输出、异步任务、模型路由、工具调用、RAG/记忆、导出服务等能力。

在公司项目中，我更多负责前端交互、AI 生成结果展示、项目页、编辑预览、会员支付、国际化、导出入口，以及部分 Agent 后端链路的问题排查。

这次做 Super Agent Console，是想把这些经验往前推进一步：

- 不只做前端展示，而是自己设计 Agent Run 的创建和执行链路。
- 不只解析 SSE，而是自己定义 AgentEvent 协议。
- 不只展示最终答案，而是展示模型分析、Tool 调用、Skill 执行和最终回答。
- 不只本地运行，而是打通 Docker、K3S、ConfigMap、Secret、MySQL、CLS 日志和域名访问。
- 不只做 Mock，而是接入火山方舟平台的豆包 Seed 2.0 模型，验证真实模型 tool call 链路。

## 项目定位

这个 Demo 的定位是：

```txt
一个用于面试展示和个人能力补齐的轻量版 AI Agent Runtime / Trace Console。
```

它解决的不是“用户能不能和 AI 聊天”，而是：

```txt
一次 Agent 任务是怎么被创建的？
模型什么时候参与决策？
模型如何决定调用工具？
服务端如何校验工具和参数？
Tool 内部如何编排 Skill？
Skill 如何产生中间态输出？
最终答案如何流式返回给前端？
整个过程如何落库、记录日志、复盘和排障？
```

## 技术栈

前端：

- Nuxt 3
- Vue 3
- TypeScript
- Composition API
- SSE 流式消费
- Markdown 渲染

服务端：

- Nitro Server API
- Prisma
- MySQL
- pino JSON 日志
- Model Adapter
- Tool Router
- Skill Executor
- 轻量 JSON Schema 校验

部署和运维：

- Docker
- GitHub Actions
- GitHub Container Registry
- K3S
- Traefik Ingress
- cert-manager / HTTPS
- K3S ConfigMap / Secret
- 腾讯云 CLS 日志采集

真实模型：

- 火山方舟平台
- 豆包 Seed 2.0 Lite
- OpenAI-compatible Chat Completions 协议
- 流式输出
- tool call

## 核心架构

项目主链路是：

```txt
前端提交用户输入
↓
POST /api/conversations/messages
↓
创建 conversation / message / run
↓
clientRequestId 幂等校验
↓
返回 conversationId / messageId / runId / traceId
↓
前端基于 runId 建立 SSE 连接
↓
GET /api/agent/runs/:runId/events
↓
Agent Runtime 执行
↓
模型进行 tool planning
↓
模型返回 tool_call
↓
服务端校验 Tool 白名单和参数 schema
↓
Tool Router 路由到 Tool
↓
Tool 内部按 workflow 编排 Skill
↓
Skill 调用模型生成结构化 JSON
↓
Tool Result 回填给模型
↓
模型生成最终答案
↓
SSE 推送 AgentEvent
↓
前端展示 Timeline / Tool / Skill / Final Answer
↓
AgentEvent / ToolCall / SkillRun / AgentRun 写入 MySQL
↓
stdout JSON 日志被 CLS 采集
```

## 我负责的内容

这个项目是个人 Demo，所以从需求拆解、架构设计、编码、部署到排障都是我自己完成的。

我主要做了这些事情：

1. 初始化 Nuxt 3 全栈项目，规划前端、服务端、Prisma、K8S、文档目录。
2. 设计双接口 Agent Run 链路：先创建 Run，再用 runId 建立 SSE 订阅。
3. 设计 AgentEvent 协议，统一 `eventType`、`status`、`runId`、`traceId`、`sequence`、`data` 等字段。
4. 实现前端 Agent Console，展示输入框、AI 输出区、Timeline、运行状态、Tool/Skill 过程卡片。
5. 实现打字机效果、运行中 loading、Markdown 最终答案渲染。
6. 设计 Tool Schema、Skill Definition、Tool Workflow 的 TS 配置层，为后续配置后台预留结构。
7. 实现 Tool Router、轻量 JSON Schema 校验、workflow input mapping 和 Skill Executor。
8. 接入火山方舟 Model Adapter，支持豆包 Seed 2.0 Lite 流式输出和 tool call。
9. 将 Skill 从固定逻辑升级为 model 模式，由 Skill 内部调用模型生成结构化 JSON。
10. 使用 Prisma + MySQL 落库 Conversation、Message、AgentRun、AgentEvent、ToolCall、SkillRun 和 Feedback。
11. 实现 Run 详情页、Run 列表页、Conversation 列表页和 Feedback 管理页。
12. 接入访问码登录、管理员权限、httpOnly cookie、朋友试用反馈入口。
13. 增加 Run 频控、全站频控、并发限制、输入长度限制和 `MODEL_ENABLED` 防灾开关。
14. 编写 Dockerfile、构建镜像，推送 GHCR，并通过 GitHub Actions 自动部署到 K3S。
15. 在腾讯云香港轻量服务器上搭建 K3S、Ingress、HTTPS、ConfigMap、Secret 和 MySQL。
16. 接入腾讯云 CLS，通过 stdout JSON 日志排查线上问题。
17. 梳理香港服务器访问北京模型接口不稳定的问题，并沉淀国内服务器 + TCR 的迁移预案。

## 核心亮点

### 1. 从“聊天接口”升级为 Agent 执行链路

我没有把它做成一个简单的 `/chat` 接口，而是拆成：

```txt
POST /api/conversations/messages
GET /api/agent/runs/:runId/events
```

前者负责创建会话、消息和 Agent Run，并处理幂等。

后者负责基于 runId 推送这次 Agent Run 的执行过程。

这样设计的好处是，前端不会和某一次具体模型请求强绑定，后续如果接入 NSQ、Redis Replay 或异步消费者，前端接口形态不用大改。

### 2. AgentEvent 协议贯穿前端、数据库和日志

我把一次 Agent 执行过程抽象成一组事件：

```txt
agent_start
prompt_loaded
model_call_start
model_text_delta
model_tool_call_decision
tool_call_start
tool_progress_delta
skill_start
skill_progress_delta
skill_result
tool_call_result
final_answer_delta
agent_done
agent_error
```

每个事件都会：

- 推送给前端 SSE。
- 追加到内存 run-store。
- 写入 MySQL。
- 输出 stdout JSON 日志。

这样前端 Timeline、Run 详情页、数据库复盘和 CLS 日志排查都使用同一套事件协议。

### 3. Tool / Skill 配置化，为后续平台化预留空间

我没有把 Tool 和 Skill 的逻辑全部硬编码在 Runtime 里，而是抽成了几类配置：

- `server/agent-config/tools.ts`
- `server/agent-config/skills.ts`
- `server/agent-config/workflows.ts`
- `server/agent-config/models.ts`

Tool 里定义名称、描述、参数 schema、启停开关和 workflow。

Skill 里定义输入 schema、输出 schema、执行模式和 handlerName。

Workflow 里定义 Tool 内部有哪些 Skill，以及每一步的 input mapping。

这套结构目前是 TS 配置文件，后续可以平滑迁移到配置后台。

### 4. Model Adapter 隔离模型供应商

我把“模型服务平台”和“具体模型”分开处理。

例如：

```txt
MODEL_PROVIDER=volcengine_ark
MODEL_NAME=doubao-seed-2-0-lite-260428
```

Agent Runtime 只依赖统一的 `ModelAdapter` 接口，不直接依赖火山方舟 SDK 或具体 HTTP 实现。

这样后续如果要接 DeepSeek、通义千问、智谱或 OpenAI-compatible 服务，只需要新增 Adapter 或切换配置。

### 5. 真实模型 tool call 闭环

真实模型链路不是只生成最终答案，而是两段模型调用：

```txt
第一次模型请求：tool planning
↓
模型返回 tool_call
↓
服务端执行 Tool / Skill
↓
第二次模型请求：基于 Tool Result 生成最终答案
```

Tool 执行过程中，Skill 也可以调用模型生成结构化 JSON。

也就是说，这个 Demo 里模型既参与任务决策，也参与 Skill 结果生成，还参与最终回答生成。

### 6. 可观测性和复盘能力

一次 Run 执行完之后，可以在 Run 详情页看到：

- 用户输入
- run 状态
- runId / traceId
- AgentEvent 列表
- Tool 调用参数和结果
- Skill 输入、过程输出和结果
- 最终答案
- 错误信息

服务端日志全部输出 JSON，并接入 CLS。

线上出现过模型请求超时后，我增强了 `agent_error` 日志字段：

```txt
phase
errorMessage
errorName
isTimeout
requestTimeoutMs
```

这样可以判断失败发生在 tool planning、tool execution 还是 final answer 阶段。

### 7. 从开发到上线的完整闭环

这个项目不是只停在本地。

我实际完成了：

- 域名购买和 DNS 解析。
- 香港轻量服务器初始化。
- K3S 单节点部署。
- Docker 镜像构建。
- GHCR 镜像推送。
- GitHub Actions 自动部署。
- K3S ConfigMap / Secret 注入。
- MySQL 自建和 Prisma migration。
- HTTPS 证书。
- CLS 日志采集。
- 线上访问码登录和反馈收集。

这部分对我来说是一次从前端工程师向“能独立交付 AI 应用 Demo”的能力补齐。

## 和上一份工作的关联

我上一份工作接触过 PagePop AI 内容创作平台。

在公司项目里，我参与过：

- Nuxt 3 / Vue 3 前端核心页面。
- AI 生成结果展示。
- 流式输出解析。
- 项目管理、编辑预览、导出入口。
- 会员、积分、支付、多语言和海外版本。
- super_agent、异步任务、模型路由、工具调用、RAG/记忆相关问题排查。

但公司项目规模比较大，很多底层能力已经由团队或基础设施提供。

比如：

- 配置中心。
- 日志采集。
- 模型路由。
- 异步任务。
- 工具调用。
- 线上部署。

我在业务开发中使用和排查过这些能力，但不一定每一层都从零搭过。

Super Agent Console 的价值就在于，我用一个小项目把这些能力拆开重新实现：

```txt
公司项目经验：知道真实业务里的 Agent 是怎么工作的
个人 Demo：自己从零搭一条可运行、可展示、可复盘的轻量链路
```

所以面试中我不会把这个 Demo 描述成“我做了一个聊天机器人”，而是会描述成：

```txt
我基于上一份 AI 内容创作平台的经验，复刻了一个轻量版 Agent Runtime 和 Trace Console，用来证明自己对 Agent 执行链路、流式事件、工具调用、落库复盘和上线部署的理解。
```

## 可以重点讲的技术问题

### 问题 1：为什么要拆成创建 Run 和 SSE 订阅两个接口？

因为 Agent 执行通常不是一个同步短请求。

创建接口只负责：

- 创建会话。
- 创建消息。
- 创建 run。
- 做 `clientRequestId` 幂等。
- 返回 runId。

SSE 接口负责：

- 基于 runId 推送执行过程。
- 承载长连接。
- 后续可以平滑替换为异步任务消费模式。

这样前端只依赖 runId，而不关心后端到底是同步执行、in-process async task，还是 NSQ 消费者执行。

### 问题 2：AgentEvent 的 eventType 和 status 有什么区别？

`eventType` 表示发生了什么。

比如：

```txt
model_call_start
tool_call_start
skill_result
agent_error
```

`status` 表示当前 Run 走到了什么状态。

比如：

```txt
running
model_calling
tool_calling
skill_running
generating
completed
failed
```

两者不能混用。

一个 Run 可以处于 `tool_calling` 状态，同时产生多个不同的事件，例如 `tool_progress_delta`、`skill_start`、`skill_result`。

### 问题 3：为什么需要 Tool Schema 校验？

模型返回的 tool call 不能直接信任。

它可能返回：

- 不存在的工具名。
- 被禁用的工具。
- 不符合 schema 的参数。
- 空参数或类型错误参数。

所以服务端需要做：

```txt
Tool 白名单校验
Tool enabled 校验
arguments JSON Schema 校验
Tool Router 路由
```

这也是 Agent 系统里很重要的安全边界。

### 问题 4：Skill 为什么也要有输入输出 schema？

因为 Tool 内部 workflow 后续可能配置化。

如果 Skill 没有输入输出约束，workflow 就很难维护。

当前我用轻量 JSON Schema 校验 Skill 输入和输出，保证：

- 上一步输出可以稳定映射到下一步输入。
- 模型生成的结构化 JSON 不符合要求时能及时失败。
- Run 详情页展示的数据结构更稳定。

### 问题 5：为什么不逐 token 落库？

真实模型流式输出时，可能一个 token 就产生一个 chunk。

如果每个 chunk 都落成 AgentEvent，一次 Run 可能有几千条事件。

这会带来几个问题：

- 数据库事件量过大。
- Run 详情页难以阅读。
- CLS 检索噪音变多。
- Timeline 很难定位关键阶段。

所以我做了事件合并：按文本长度或句子边界聚合，再生成 `model_text_delta`、`skill_progress_delta` 和 `final_answer_delta`。

### 问题 6：上线后遇到过什么问题？

主要遇到过几类：

1. Nuxt 生产环境 runtimeConfig 读取和普通环境变量不一致，导致 access code 线上 401。
2. 生产 cookie 设置了 secure，但 HTTP 下浏览器不会发送 cookie，于是必须上 HTTPS。
3. K3S Ingress backend port 曾经误填为容器端口，后来确认 Ingress 应该指向 Service port。
4. `/api/config-demo` 曾经输出过过多服务端配置细节，后来改成只输出脱敏加载状态。
5. 香港服务器访问火山方舟北京接口不稳定，出现模型请求超时，因此增加超时诊断日志，并整理国内服务器 + TCR 迁移预案。

这些问题让我对线上 AI 应用有更完整的认识：它不只是代码问题，还包括配置、网络、证书、镜像仓库、日志和部署地域。

## 面试时的项目讲法

可以按下面这段来讲：

> 我最近做了一个叫 Super Agent Console 的个人工程化 Demo。它不是单纯的 AI 聊天页面，而是一个轻量版 Agent Runtime 和 Trace Console。前端基于 Nuxt 3 和 Vue 3，服务端用 Nitro API，数据库用 MySQL + Prisma，部署在自建 K3S 上。  
>
> 它的核心链路是：前端先调用创建消息接口，服务端创建 conversation、message 和 run，并用 clientRequestId 做幂等；然后前端基于 runId 建立 SSE 连接。Agent Runtime 会先调用真实模型做 tool planning，如果模型返回 tool call，服务端会校验 Tool 白名单和参数 schema，再通过 Tool Router 执行 Tool。Tool 内部按 workflow 编排多个 Skill，Skill 可以继续调用模型生成结构化 JSON。最后 Tool Result 回填给模型，生成最终答案。  
>
> 整个过程中，我定义了一套 AgentEvent 协议，事件会同时推给前端 Timeline、写入 MySQL、输出 JSON stdout 日志，并通过 CLS 做线上检索。这样一次 Agent Run 不只看最终答案，还能复盘模型什么时候调用工具、Tool 参数是什么、Skill 输入输出是什么，以及失败发生在哪个阶段。  
>
> 这个项目也打通了 Docker、GHCR、GitHub Actions、K3S、ConfigMap、Secret、MySQL、HTTPS 和 CLS 日志采集。后面为了朋友试用，我还加了访问码登录、管理员权限、频控、并发限制、模型防灾开关和反馈收集。  
>
> 我做它的原因，是因为上一份工作中接触过 AI 内容创作平台和 Agent 相关能力，但很多底层链路在公司里已经由基础设施提供。这个 Demo 是我把那些经验拆开后，用一个可控项目重新实现一遍，补齐自己从前端到 Agent 服务端和部署交付的完整能力。

## 简历项目写法

### Super Agent Console｜AI Agent 工程化 Demo

**项目简介：**  
基于 Nuxt 3 + TypeScript + MySQL + Prisma + Docker + K3S 构建的 AI Agent 工程化 Demo，用于复刻轻量版 Agent Runtime 和 Trace Console。项目支持真实模型流式输出、tool call、Tool/Skill workflow 编排、AgentEvent Timeline、Run 详情复盘、JSON stdout 日志和 K3S 部署。

**技术栈：**  
Nuxt 3、Vue 3、TypeScript、Nitro API、MySQL、Prisma、Docker、K3S、GitHub Actions、GHCR、pino、CLS、火山方舟、豆包 Seed 2.0 Lite。

**个人职责：**

- 设计双接口 Agent Run 链路，通过 `POST /api/conversations/messages` 创建 Run，并通过 `GET /api/agent/runs/:runId/events` 推送 SSE AgentEvent。
- 设计 AgentEvent 协议，统一模型分析、工具调用、Skill 执行、最终回答和异常事件，并同步支持前端 Timeline、数据库落库和 JSON 日志。
- 实现 Tool Schema、Skill Definition、Tool Workflow 和 Model Adapter 配置层，支持 Tool Router、参数校验、workflow input mapping 和 Skill 执行。
- 接入火山方舟豆包 Seed 2.0 Lite，支持流式输出、tool call、Tool Result 回填和最终答案生成。
- 使用 Prisma + MySQL 持久化 Conversation、Message、AgentRun、AgentEvent、ToolCall、SkillRun 和 Feedback，提供 Run 详情页、Run 列表页和 Conversation 列表页。
- 完成 Docker 镜像构建、GHCR 推送、GitHub Actions 自动部署、K3S ConfigMap/Secret 注入、HTTPS 和 CLS 日志采集。
- 增加访问码登录、管理员权限、Run 频控、并发限制、输入长度限制、模型防灾开关和反馈收集能力，保障公网试用安全。

**项目成果：**

- 打通从用户输入、Agent Run 创建、真实模型 tool call、Tool/Skill 执行、流式输出、数据库落库到线上日志排查的完整闭环。
- 实现轻量版 Agent Trace 能力，使一次 Agent 执行可以按 runId / traceId 复盘模型、工具、Skill 和最终回答过程。
- 通过个人 Demo 补齐前端工程师在 AI Agent 服务端、模型接入、K3S 部署和线上问题排查方面的能力。

## 可以继续优化的方向

当前项目还是 MVP，不会把它包装成完整生产系统。

后续可以继续补：

- NSQ 异步任务，将创建 Run 和 Agent Runtime 执行彻底解耦。
- Redis SSE Replay，用于前端流式解析和线上问题复现。
- 更完整的上下文管理，包括历史消息裁剪和 token budget。
- 多 Tool 动态调用。
- Tool / Skill 配置后台。
- Coze Loop 或自研 Trace / Eval 能力。
- RAG 和 Memory。
- 国内服务器 + TCR 迁移，改善香港服务器访问北京模型接口不稳定的问题。

面试中我会明确说明：当前版本是为了展示核心 Agent 执行链路和工程化交付能力，不会把它说成一个完整商业化平台。
