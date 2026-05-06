# Super Agent Console 需求文档 / Codex 执行说明

## 0. 项目一句话目标

请实现一个基于 **Nuxt 3 + TypeScript + MySQL + Prisma + Docker + 腾讯云 TKE/CLS + Nacos** 的 AI Agent 工程化 Demo。

该 Demo 的核心目标不是做一个普通聊天机器人，而是打通：

```txt
Nuxt 3 全栈应用
↓
Docker 镜像构建
↓
腾讯云 TCR 镜像仓库
↓
腾讯云 TKE Pod 部署
↓
TKE Nacos 插件配置注入
↓
stdout JSON 日志输出
↓
CLS 日志检索
↓
AI 流式输出
↓
Agent Timeline 可视化
↓
工具调用事件展示
↓
数据库落库与 Run 详情复盘
```

项目需要能在 7 天内完成 MVP，可用于面试展示。

---

## 1. 背景说明

我是前端工程师，熟悉 Nuxt 3、Vue、TypeScript，并在公司项目中做过：

- Nuxt 3 项目搭建
- 环境变量设计
- 项目目录定义
- 登录模块
- AI 交互输入框
- 对话页 SSE 协议解析
- AI 流式输出展示
- 工具调用状态展示

当前希望通过这个 Demo 补齐：

- Nuxt 服务端能力
- AI 模型调用能力
- Agent Runtime 基础能力
- 工具调用规则设计
- Docker 镜像构建
- TKE 容器部署
- TKE Nacos 插件接入与环境变量集中管理
- CLS 标准日志采集
- runId / traceId 链路追踪
- 独立域名与香港服务器上的网站访问层搭建

---

## 2. 项目名称

```txt
Super Agent Console
```

中文说明：

```txt
AI Agent 执行链路可视化工程 Demo
```

---

## 3. 技术栈

### 3.1 前后端框架

```txt
Nuxt 3
Vue 3
TypeScript
Nitro Server API
```

### 3.2 数据库

```txt
MySQL
Prisma ORM
```

### 3.3 AI 模型

第一版支持火山方舟 / 豆包模型。

要求：

- 模型调用逻辑封装到 server/services/doubao-client.ts
- API Key 从环境变量读取
- 模型 ID 从环境变量读取
- 先支持普通文本生成
- 再支持流式输出
- 如果真实模型暂时不可用，需要保留 mock 模式，保证 Demo 可运行

### 3.4 日志

```txt
pino 或其他 JSON logger
```

要求：

- 所有服务端日志输出到 stdout
- 日志格式必须是 JSON
- 每次请求生成 traceId
- 每次 Agent 执行生成 runId
- 关键 AgentEvent 必须同时：
  - 通过 SSE 推给前端
  - 写入数据库
  - 输出 JSON 日志

### 3.5 部署

```txt
Docker
Tencent Container Registry / TCR
Tencent Kubernetes Engine / TKE
Tencent Cloud Log Service / CLS
Tencent TKE Nacos 插件
```

### 3.6 配置中心

第一版环境变量通过 **腾讯云 TKE 自带的 Nacos 插件**接入。

要求：

- 应用仍保留 `.env.example` 作为本地开发和变量说明模板。
- 本地开发可以从 `.env` 读取配置。
- 生产环境优先从 Nacos 配置读取运行时配置。
- Nacos 中管理普通配置，例如 `APP_NAME`、`APP_VERSION`、`ARK_BASE_URL`、`ARK_MODEL_ID`、`LOG_LEVEL`、`MOCK_MODEL_ENABLED`。
- 敏感配置仍需要按实际部署方式安全注入，不允许写死在代码、镜像或 Git 仓库中。
- README 需要说明本地 `.env` 与 TKE Nacos 配置之间的对应关系。

---

## 4. MVP 范围

### 4.1 必须实现

1. Nuxt 3 项目可本地运行。
2. MySQL + Prisma 可用。
3. Dockerfile 可构建应用镜像。
4. docker-compose.yml 可本地启动 Nuxt + MySQL。
5. 提供健康检查接口：
   - GET /api/health
   - GET /api/ready
   - GET /api/db-check
6. 提供 Agent Mock Run 接口：
   - POST /api/agent/mock-run
7. 提供 Agent 真实 Run 接口：
   - POST /api/agent/run
8. 支持 SSE 流式返回 AgentEvent。
9. 前端展示 Agent Timeline。
10. 前端展示 AI 流式输出。
11. 至少实现 2 个工具：
   - parseJobDescription
   - generateInterviewPlan
12. Agent Run、AgentEvent、ToolCall、Message 落库。
13. 提供 Run 详情页。
14. 服务端输出标准 JSON 日志。
15. 提供 Kubernetes YAML：
   - deployment.yaml
   - service.yaml
   - ingress.yaml，可选
   - configmap.yaml
   - secret.example.yaml
16. 接入 TKE Nacos 插件作为生产环境配置来源。
17. 提供网站访问层搭建说明：
   - 域名解析
   - 香港服务器反向代理
   - 后续转发到 TKE 服务或临时静态/占位页面
   - HTTPS 证书配置建议
18. 提供 `timeline.md`，按日期记录项目执行过程中的每一次具体动作。
19. README 说明如何：
   - 本地启动
   - 构建镜像
   - 推送 TCR
   - 部署 TKE
   - 查看日志
   - 配置环境变量
   - 配置 Nacos
   - 配置域名与香港服务器访问层

### 4.2 暂不实现

以下功能不在 7 天 MVP 范围：

- 登录注册
- 复杂权限
- 完整 Prompt 管理后台
- 完整 Tool 管理后台
- RAG 知识库
- 多用户体系
- 企业级监控告警
- 完整 CI/CD 平台
- 多环境发布系统
- 复杂 UI 美化

---

## 5. 页面需求

### 5.1 首页 / Agent Console

路径：

```txt
/
```

页面布局建议：

```txt
顶部：项目标题 + 当前环境 + 健康状态
左侧：用户输入区
中间：AI 流式输出区
右侧：Agent Timeline
底部：runId / traceId / 操作按钮
```

功能：

- 输入岗位 JD 或测试文本
- 点击“Mock Run”触发 /api/agent/mock-run
- 点击“Real Run”触发 /api/agent/run
- 实时显示 SSE 返回内容
- 展示 Agent Timeline
- 展示工具调用状态
- 显示当前 runId 和 traceId
- Run 完成后提供“查看详情”入口

### 5.2 Run 详情页

路径：

```txt
/runs/[id]
```

功能：

- 展示 Agent Run 基础信息
- 展示用户输入
- 展示最终输出
- 展示事件列表
- 展示工具调用列表
- 展示每个工具的参数和结果
- 展示耗时
- 展示错误信息

### 5.3 Deploy Info 页面

路径：

```txt
/deploy
```

功能：

- 显示应用名称
- 显示运行环境 NODE_ENV
- 显示当前版本 APP_VERSION
- 显示健康检查状态
- 显示数据库连接状态
- 显示最近一次 runId

---

## 6. 推荐目录结构

```txt
super-agent-console/
├── app.vue
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── README.md
├── timeline.md
├── pages/
│   ├── index.vue
│   ├── deploy.vue
│   └── runs/
│       └── [id].vue
├── components/
│   ├── AgentConsole.vue
│   ├── AgentInput.vue
│   ├── AgentStreamOutput.vue
│   ├── AgentTimeline.vue
│   ├── ToolCallCard.vue
│   ├── RunMetaBar.vue
│   └── HealthStatus.vue
├── composables/
│   ├── useAgentRun.ts
│   └── useSseStream.ts
├── server/
│   ├── api/
│   │   ├── health.get.ts
│   │   ├── ready.get.ts
│   │   ├── db-check.get.ts
│   │   ├── runs/
│   │   │   └── [id].get.ts
│   │   └── agent/
│   │       ├── mock-run.post.ts
│   │       └── run.post.ts
│   ├── middleware/
│   │   └── request-id.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── prisma.ts
│   │   ├── sse.ts
│   │   ├── ids.ts
│   │   └── runtime-config.ts
│   └── services/
│       ├── agent-runtime.ts
│       ├── agent-events.ts
│       ├── doubao-client.ts
│       ├── tool-registry.ts
│       ├── tool-executor.ts
│       └── prompt-builder.ts
├── prisma/
│   └── schema.prisma
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── secret.example.yaml
└── docs/
    ├── architecture.md
    ├── deploy.md
    ├── website-layer.md
    └── interview-notes.md
```

---

## 7. 数据库设计

使用 Prisma，数据库为 MySQL。

### 7.1 Conversation

用于后续扩展会话能力。

```prisma
model Conversation {
  id        String   @id @default(cuid())
  title     String?
  messages  Message[]
  runs      AgentRun[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 7.2 Message

```prisma
model Message {
  id             String        @id @default(cuid())
  conversationId String?
  conversation   Conversation? @relation(fields: [conversationId], references: [id])
  role           String
  content        String        @db.Text
  runId          String?
  createdAt      DateTime      @default(now())
}
```

role 可选值：

```txt
user
assistant
system
tool
```

### 7.3 AgentRun

```prisma
model AgentRun {
  id             String        @id @default(cuid())
  conversationId String?
  conversation   Conversation? @relation(fields: [conversationId], references: [id])
  traceId        String
  userInput      String        @db.Text
  status         String
  finalOutput    String?       @db.Text
  startedAt      DateTime      @default(now())
  endedAt        DateTime?
  events         AgentEvent[]
  toolCalls      ToolCall[]
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}
```

status 可选值：

```txt
running
success
failed
cancelled
```

### 7.4 AgentEvent

```prisma
model AgentEvent {
  id        String   @id @default(cuid())
  runId     String
  run       AgentRun @relation(fields: [runId], references: [id])
  traceId   String
  type      String
  payload   Json
  createdAt DateTime @default(now())
}
```

### 7.5 ToolCall

```prisma
model ToolCall {
  id        String   @id @default(cuid())
  runId     String
  run       AgentRun @relation(fields: [runId], references: [id])
  traceId   String
  toolName  String
  arguments Json
  result    Json?
  status    String
  startedAt DateTime @default(now())
  endedAt   DateTime?
  createdAt DateTime @default(now())
}
```

status 可选值：

```txt
running
success
failed
```

---

## 8. AgentEvent 协议

前端、后端、数据库、日志系统统一使用 AgentEvent 协议。

```ts
export type AgentEvent =
  | {
      type: 'agent_start'
      runId: string
      traceId: string
      timestamp: string
    }
  | {
      type: 'prompt_loaded'
      runId: string
      traceId: string
      promptName: string
      timestamp: string
    }
  | {
      type: 'model_stream_start'
      runId: string
      traceId: string
      model: string
      timestamp: string
    }
  | {
      type: 'tool_call_start'
      runId: string
      traceId: string
      toolCallId: string
      toolName: string
      args: unknown
      timestamp: string
    }
  | {
      type: 'tool_call_result'
      runId: string
      traceId: string
      toolCallId: string
      toolName: string
      result: unknown
      timestamp: string
    }
  | {
      type: 'final_answer_delta'
      runId: string
      traceId: string
      content: string
      timestamp: string
    }
  | {
      type: 'agent_done'
      runId: string
      traceId: string
      resultId?: string
      timestamp: string
    }
  | {
      type: 'agent_error'
      runId: string
      traceId: string
      error: string
      timestamp: string
    }
```

要求：

- SSE 每条消息发送一个 AgentEvent。
- 数据库 agent_events 表保存每个 AgentEvent。
- logger 输出每个关键 AgentEvent。
- 前端 Timeline 根据 type 渲染不同状态。

---

## 9. 服务端接口需求

### 9.1 GET /api/health

用途：进程健康检查。

返回：

```json
{
  "status": "ok",
  "service": "super-agent-console",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### 9.2 GET /api/ready

用途：服务是否准备好接流量。

检查：

- 应用启动正常
- 必要环境变量存在

返回：

```json
{
  "status": "ready",
  "env": "production",
  "version": "0.1.0"
}
```

### 9.3 GET /api/db-check

用途：数据库连接检查。

返回成功：

```json
{
  "status": "ok",
  "database": "connected"
}
```

返回失败：

```json
{
  "status": "error",
  "database": "disconnected",
  "message": "..."
}
```

### 9.4 POST /api/agent/mock-run

用途：不依赖真实模型，模拟一次完整 Agent 执行流程。

请求：

```json
{
  "input": "请分析这个岗位 JD，并生成 7 天准备计划"
}
```

返回：

```txt
Content-Type: text/event-stream
```

SSE 事件顺序：

```txt
agent_start
prompt_loaded
tool_call_start
tool_call_result
final_answer_delta
final_answer_delta
agent_done
```

要求：

- 生成 runId
- 生成 traceId
- 创建 agent_runs 记录
- 写入 agent_events
- 写入 tool_calls
- 输出 JSON 日志
- 前端可实时展示 Timeline

### 9.5 POST /api/agent/run

用途：真实模型调用版本。

请求：

```json
{
  "input": "岗位 JD 文本..."
}
```

处理流程：

```txt
1. 创建 traceId
2. 创建 runId
3. 创建 AgentRun
4. 发送 agent_start
5. 加载 prompt
6. 发送 prompt_loaded
7. 调用模型
8. 流式发送 final_answer_delta
9. 在合适位置模拟或触发工具调用
10. 执行 parseJobDescription
11. 执行 generateInterviewPlan
12. 保存 ToolCall
13. 保存 AgentEvent
14. 更新 AgentRun 状态
15. 发送 agent_done
```

如果模型调用失败：

- 发送 agent_error
- agent_runs.status 更新为 failed
- 输出 error 日志
- 前端展示错误状态

### 9.6 GET /api/runs/[id]

用途：获取 Run 详情。

返回：

```json
{
  "run": {},
  "events": [],
  "toolCalls": [],
  "messages": []
}
```

---

## 10. 工具设计

第一版只实现 2 个工具。

### 10.1 parseJobDescription

用途：解析岗位 JD。

输入：

```ts
{
  jdText: string
}
```

输出：

```ts
{
  title?: string
  requiredSkills: string[]
  niceToHaveSkills: string[]
  responsibilities: string[]
  risks: string[]
}
```

实现方式：

- 第一版可以用简单规则 + 模型总结。
- 如果模型不可用，则使用 mock 返回。

### 10.2 generateInterviewPlan

用途：根据岗位要求生成 7 天准备计划。

输入：

```ts
{
  requiredSkills: string[]
  days: number
}
```

输出：

```ts
{
  days: Array<{
    day: number
    title: string
    tasks: string[]
    deliverable: string
  }>
}
```

默认 days = 7。

---

## 11. Agent Runtime 设计

请在 `server/services/agent-runtime.ts` 中实现核心流程。

建议导出：

```ts
export async function runMockAgent(input: string, send: SendSseEvent): Promise<void>
export async function runRealAgent(input: string, send: SendSseEvent): Promise<void>
```

其中 `send` 函数负责：

1. 发送 SSE 给前端。
2. 写入 agent_events 表。
3. 输出 JSON 日志。

建议定义公共函数：

```ts
async function emitAgentEvent(event: AgentEvent): Promise<void>
```

要求：

- 不要把所有逻辑写在 API handler 里。
- API handler 只负责读取请求、设置 SSE、调用 service。
- Agent Runtime 负责业务流程。
- Tool Executor 负责工具执行。
- Logger 负责日志。
- Prisma 负责数据库。

---

## 12. SSE 实现要求

在 `server/utils/sse.ts` 中封装 SSE 工具。

要求支持：

- 设置 `Content-Type: text/event-stream`
- 设置 `Cache-Control: no-cache`
- 设置 `Connection: keep-alive`
- 按事件逐条 write
- 异常时发送 agent_error
- 完成时 close stream

前端 `useSseStream.ts` 负责消费流。

要求：

- 支持 POST 请求发起 SSE
- 支持解析 `data: ...` 格式
- 支持逐条解析 AgentEvent
- 支持错误处理
- 支持 loading 状态
- 支持完成状态

---

## 13. 前端组件需求

### 13.1 AgentConsole.vue

职责：页面主容器。

包含：

- AgentInput
- AgentStreamOutput
- AgentTimeline
- RunMetaBar

### 13.2 AgentInput.vue

功能：

- 文本输入框
- Mock Run 按钮
- Real Run 按钮
- 清空按钮

### 13.3 AgentStreamOutput.vue

功能：

- 展示 final_answer_delta 拼接后的内容
- loading 状态
- error 状态

### 13.4 AgentTimeline.vue

功能：

- 按顺序展示 AgentEvent
- 不同事件使用不同标题
- tool_call_start 显示“工具调用中”
- tool_call_result 显示“工具调用完成”
- agent_done 显示“完成”
- agent_error 显示“失败”

### 13.5 ToolCallCard.vue

功能：

- 展示工具名称
- 展示调用参数
- 展示返回结果
- 展示状态

### 13.6 RunMetaBar.vue

功能：

- 展示 runId
- 展示 traceId
- 展示当前状态
- 展示 Run 详情链接

---

## 14. 标准日志规范

所有日志必须是 JSON。

建议字段：

```ts
{
  timestamp: string
  level: 'info' | 'warn' | 'error'
  service: 'super-agent-console'
  env: string
  traceId?: string
  runId?: string
  eventType?: string
  message: string
  durationMs?: number
  toolName?: string
  errorCode?: string
  errorMessage?: string
}
```

关键日志事件：

```txt
request_start
request_end
agent_start
prompt_loaded
model_stream_start
tool_call_start
tool_call_result
tool_call_error
agent_done
agent_error
db_check_success
db_check_error
```

要求：

- 不要输出 API Key。
- 不要输出数据库密码。
- 不要输出完整敏感环境变量。
- 可以输出 runId、traceId、eventType。

---

## 15. 环境变量

`.env.example` 必须包含本地开发所需变量，同时作为 Nacos 配置项的说明模板：

```bash
NODE_ENV=development
APP_NAME=super-agent-console
APP_VERSION=0.1.0

DATABASE_URL=mysql://root:password@mysql:3306/super_agent_console

ARK_API_KEY=your_ark_api_key
ARK_MODEL_ID=your_model_id
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3

LOG_LEVEL=info
MOCK_MODEL_ENABLED=true
```

要求：

- 真实 `.env` 不要提交。
- 本地开发可以通过 `.env` 读取配置。
- 生产环境优先通过腾讯云 TKE 自带的 Nacos 插件读取配置。
- README 说明每个环境变量用途，以及对应的 Nacos 配置项。
- K8s YAML 需要说明哪些配置来自 Nacos，哪些配置仍通过 Secret 或其他安全方式注入。
- K8s Secret 示例不能包含真实密钥。

---

## 16. Docker 要求

### 16.1 Dockerfile

要求：

- 使用 Node LTS 镜像。
- 多阶段构建。
- 安装依赖。
- 执行 Nuxt build。
- 生产阶段只保留运行所需文件。
- 默认暴露 3000 端口。
- 启动命令运行 Nuxt server。

### 16.2 docker-compose.yml

服务：

```txt
app
mysql
```

要求：

- app 依赖 mysql。
- mysql 初始化数据库。
- app 读取 DATABASE_URL。
- 本地访问端口 3000。

---

## 17. Kubernetes YAML 要求

目录：

```txt
k8s/
```

### 17.1 deployment.yaml

要求：

- image 使用占位符：`YOUR_TCR_IMAGE_URL:TAG`
- replicas 第一版设为 1
- containerPort 3000
- 配置 envFrom ConfigMap 和 Secret
- 配置 readinessProbe
- 配置 livenessProbe

健康检查路径：

```txt
/api/health
/api/ready
```

### 17.2 service.yaml

要求：

- 暴露 3000 端口
- selector 匹配 deployment labels

### 17.3 ingress.yaml

可选。

如果不做 Ingress，README 说明如何通过 Service / LoadBalancer / 端口转发访问。

### 17.4 configmap.yaml

普通配置：

```txt
NODE_ENV
APP_NAME
APP_VERSION
ARK_BASE_URL
ARK_MODEL_ID
LOG_LEVEL
MOCK_MODEL_ENABLED
```

如果生产环境已经通过 TKE Nacos 插件统一管理上述普通配置，则 `configmap.yaml` 可以作为兜底示例或本地 Kubernetes 示例。README 需要明确实际生产部署以 Nacos 配置为准。

### 17.5 secret.example.yaml

敏感配置示例：

```txt
DATABASE_URL
ARK_API_KEY
```

不要写真实值。

### 17.6 Nacos 配置要求

生产环境配置通过腾讯云 TKE 自带的 Nacos 插件接入。

要求：

- README 说明 Nacos 插件启用、配置创建、应用读取配置的基本流程。
- 配置命名需要区分环境，例如 `super-agent-console-dev`、`super-agent-console-prod`。
- 应用启动时需要能读取 Nacos 下发的运行配置。
- 本地开发无需强依赖 Nacos，避免影响本地调试效率。
- 不允许把 Nacos 中的敏感配置示例写成真实值。

### 17.7 网站访问层要求

当前已经购买域名和香港服务器。项目执行顺序上，允许先搭建网站访问层，再逐步补齐 Nuxt 代码和后端能力。

第一阶段网站层目标：

- 域名 DNS 解析到香港服务器。
- 香港服务器上配置 Nginx 或 Caddy 作为入口。
- 在 Nuxt 应用完成前，可以先部署一个临时占位页或反向代理到本地/测试服务。
- 后续 Nuxt 应用部署到 TKE 后，香港服务器入口可以反向代理到 TKE 暴露地址。
- 建议尽早配置 HTTPS，证书可使用 Let's Encrypt 或云厂商证书。

README 或 `docs/website-layer.md` 需要说明：

- 域名解析记录配置。
- 香港服务器入口服务配置。
- 反向代理目标如何从临时页面切换到 TKE 服务。
- HTTPS 配置方式。
- 常见排障命令。

---

## 18. README 要求

README 至少包含：

1. 项目介绍
2. 技术栈
3. 功能清单
4. 本地启动
5. 环境变量说明
6. 数据库初始化
7. Docker 本地运行
8. 镜像构建命令
9. 推送 TCR 命令示例
10. TKE 部署命令示例
11. CLS 日志查询说明
12. Nacos 配置接入说明
13. 域名与香港服务器网站访问层说明
14. AgentEvent 协议说明
15. 数据库表说明
16. 项目架构图 Mermaid
17. 面试讲解要点

Mermaid 架构图示例：

```mermaid
flowchart TD
  User[User Browser] --> Nuxt[Nuxt 3 App]
  Nuxt --> API[Nitro Server API]
  API --> Agent[Agent Runtime]
  Agent --> Model[Doubao / Ark Model]
  Agent --> Tools[Tool Executor]
  Agent --> DB[(MySQL)]
  Agent --> Log[JSON stdout Logs]
  Log --> CLS[Tencent CLS]
  Nacos[TKE Nacos Plugin] --> API
  Domain[Custom Domain] --> HK[Hong Kong Server / Reverse Proxy]
  HK --> TKE
  Docker[Docker Image] --> TCR[Tencent TCR]
  TCR --> TKE[Tencent TKE Pod]
```

---

## 19. Codex 执行顺序建议

请按以下顺序实现，不要一次性实现所有功能。

### Step 1：项目骨架

- 初始化 Nuxt 3
- 创建基础页面
- 创建 health/db-check API
- 创建 logger
- 创建 Prisma schema

验收：

```txt
npm run dev 可启动
/api/health 正常
/api/db-check 正常
```

### Step 2：网站访问层搭建

- 域名解析到香港服务器
- 香港服务器配置 Nginx 或 Caddy
- 部署临时占位页或临时反向代理
- 规划后续切换到 TKE Service / Ingress 的方式
- 记录到 `timeline.md`

验收：

```txt
域名可以访问到香港服务器上的临时页面或入口服务
```

### Step 3：Docker 本地运行

- Dockerfile
- docker-compose.yml
- .env.example
- README 本地启动说明

验收：

```txt
docker compose up -d --build 成功
```

### Step 4：AgentEvent + Mock Run

- 定义 AgentEvent 类型
- 实现 SSE 工具
- 实现 /api/agent/mock-run
- 前端消费 SSE
- 展示 Timeline

验收：

```txt
点击 Mock Run 后，前端能看到完整 Agent Timeline
```

### Step 5：数据库落库

- agent_runs
- agent_events
- tool_calls
- messages
- mock run 写库
- Run 详情页

验收：

```txt
一次 mock run 能在详情页复盘
```

### Step 6：真实模型调用

- doubao-client
- /api/agent/run
- final_answer_delta 流式输出
- 模型失败时 fallback 到 mock

验收：

```txt
Real Run 能返回真实或 mock 的流式输出
```

### Step 7：工具调用

- parseJobDescription
- generateInterviewPlan
- tool-executor
- tool_call_start / tool_call_result

验收：

```txt
Timeline 能展示至少一次工具调用全过程
```

### Step 8：K8s / Nacos / 部署文档

- k8s YAML
- TKE Nacos 插件配置说明
- TCR 推送说明
- TKE 部署说明
- CLS 日志说明
- README 完善

验收：

```txt
具备部署到腾讯云 TKE 的全部配置和说明
```

---

## 20. 验收标准

最终交付必须满足：

```txt
1. 本地 npm run dev 可运行
2. 本地 docker compose 可运行
3. /api/health 正常
4. /api/db-check 正常
5. Mock Agent Run 可运行
6. Real Agent Run 可运行或 fallback 到 mock
7. 前端能展示 AI 流式输出
8. 前端能展示 Agent Timeline
9. 至少一个 Tool Call 可展示
10. Agent Run 可落库
11. Run 详情页可查看
12. 日志为 JSON 格式
13. 日志包含 traceId / runId
14. Dockerfile 可构建镜像
15. k8s YAML 存在
16. Nacos 配置接入说明存在
17. 域名与香港服务器访问层说明存在
18. timeline.md 按日期记录项目执行动作
19. README 可指导部署
```

---

## 21. 代码风格要求

- 使用 TypeScript。
- 尽量避免 any。
- 服务端逻辑分层清楚。
- API handler 不写复杂业务。
- 错误处理要完整。
- 日志不要泄露密钥。
- 前端组件保持简单，不追求复杂 UI。
- 不要引入过多依赖。
- 优先保证主链路跑通。
- 全部执行动作需要持续记录到项目根目录 `timeline.md`，按日期维度维护在一个文件中。

---

## 22. 面试展示重点

实现后，本项目需要支持以下面试讲法：

```txt
我使用 Nuxt 3 做了一个 AI Agent 工程 Demo。
它不是普通聊天页面，而是覆盖了从开发到部署再到日志排障的完整链路。
应用通过 Docker 构建镜像，推送到腾讯云 TCR，并部署到 TKE Pod。
生产环境配置通过 TKE 自带的 Nacos 插件集中管理。
用户可以通过已购买域名访问香港服务器入口，再由入口服务转发到最终应用。
服务端所有日志以 JSON 输出到 stdout，再通过 CLS 收集和检索。
业务上，我设计了 AgentEvent 协议，前端通过 SSE 实时展示 AI 流式输出和工具调用状态。
每次 Agent 执行都有 runId 和 traceId，可以在前端 Timeline、数据库记录和 CLS 日志中串起完整链路。
这个项目证明我不仅能做 AI 前端交互，也理解服务端、Agent Runtime、容器部署和日志排障。
```

---

## 23. 重要限制

请严格遵守：

1. 不要实现登录注册。
2. 不要实现复杂权限。
3. 不要实现复杂 Prompt 管理后台。
4. 不要实现 RAG。
5. 不要依赖只有本地能跑的配置。
6. 不要把密钥写死在代码中。
7. 不要把日志写到本地文件作为主要方案。
8. 不要一次性引入复杂 UI 库导致开发拖慢。
9. 优先保证 Docker、SSE、Agent Timeline、日志、数据库主链路完成。

---

## 24. 当前阶段最终目标

7 天内完成一个：

```txt
可本地运行
可 Docker 化
可部署到 TKE
可通过 Nacos 管理生产配置
可通过域名和香港服务器访问
可输出 CLS 可采集日志
可展示 AI 流式输出
可展示 Agent 工具调用 Timeline
可落库复盘
可写入简历
可用于面试演示
```

的 Nuxt 3 全栈 Agent 工程 Demo。
