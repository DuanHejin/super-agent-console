# MVP Agent Core Plan

本阶段目标：复刻公司智能体项目的核心执行链路，让系统具备“创建 Run、订阅事件、驱动 Agent Runtime、展示 Timeline、可复盘”的最小闭环。

完成一个验收点后，将对应任务从 `- [ ]` 改为 `- [x]`。

## Scope

MVP 先不引入 NSQ、Nacos、Coze Loop、RAG、长期 Memory、多 Agent 和可视化工作流后台。

本阶段重点是：

```txt
创建消息 / Run
→ runId 订阅 SSE
→ Agent Runtime 状态机
→ Tool Router
→ Tool 编排 Skill
→ AgentEvent 推送 / 日志 / 详情页
```

## Checklist

- [ ] 定义核心 ID 体系：`conversationId`、`messageId`、`runId`、`toolCallId`、`skillRunId`、`traceId`。
- [ ] 定义 MVP 数据模型：Conversation、Message、AgentRun、AgentEvent、ToolCall、SkillRun、IdempotencyRecord。
- [x] 建立 TS 配置层，集中维护 Tool Schema、Skill Definition、Tool Workflow 和 Model 配置。
- [x] 建立 Model Adapter 接口和 mock / doubao adapter 骨架，为后续切换真实模型保留扩展边界。
- [x] 新增创建消息接口：`POST /api/conversations/messages`。
- [x] 在创建消息接口中实现 `clientRequestId` 幂等校验，重复请求返回同一组 `conversationId` / `messageId` / `runId`。
- [x] 新增 SSE 订阅接口：`GET /api/agent/runs/:runId/events`。
- [x] 将前端发送流程改为：先创建消息和 Run，再用 `runId` 建立 SSE 订阅。
- [ ] 定义统一 AgentEvent 协议，至少包含 `eventId`、`eventType`、`conversationId`、`messageId`、`runId`、`traceId`、`sequence`、`timestamp`、`status`、`data`。
- [ ] 实现 Agent Run 简单状态机：`created`、`running`、`model_calling`、`tool_calling`、`skill_running`、`generating`、`completed`、`failed`。
- [ ] 实现 mock Agent Runtime，按标准事件流输出 `agent_start`、`model_call_start`、`tool_call_start`、`skill_start`、`skill_result`、`agent_done`。
- [ ] 每个 AgentEvent 同步输出 JSON stdout 日志，字段包含 `runId`、`traceId`、`eventType`、`sequence`。
- [x] 实现 Tool Schema 静态定义。
- [ ] 实现 Tool 白名单校验和参数 schema 校验。
- [ ] 实现 Tool Router。
- [ ] 实现第一个 Tool：`analyzeJobAndGeneratePlan`。
- [x] 定义第一个 Tool 配置：`analyzeJobAndGeneratePlan`。
- [x] 定义第一个 Skill 配置：`extractJobRequirementsSkill`。
- [x] 定义第二个 Skill 配置：`generateSevenDayPlanSkill`。
- [x] 定义 Tool 内部固定 workflow 配置，编排两个 Skill。
- [ ] 实现第一个 Skill 执行器：`extractJobRequirementsSkill`。
- [ ] 实现第二个 Skill 执行器：`generateSevenDayPlanSkill`。
- [ ] 前端 Timeline 展示 Agent、Model、Tool、Skill 的执行节点。
- [ ] 前端展示 Tool 调用卡片和 Skill 执行节点。
- [x] 前端展示 SSE 连接状态、`runId`、`traceId`。
- [ ] 新增 Run 详情页：`/runs/:runId`。
- [ ] Run 详情页展示用户输入、Run 状态、AgentEvent 列表、ToolCall 列表、SkillRun 列表、最终答案、错误信息和 `traceId`。
- [ ] 接入真实模型基础调用，优先支持豆包 / 火山方舟，同时保留 mock model。
- [ ] 真实模型返回 tool call 后，可以通过 Tool Router 执行 Tool，并将 Tool Result 回填给模型。
- [ ] 最终答案支持 SSE 流式输出。

## Acceptance

- [x] 同一个 `clientRequestId` 连续请求两次，不重复创建 conversation / message / run。
- [x] 前端可以通过 `runId` 订阅一次 Agent Run 的执行过程。
- [ ] Timeline 可以完整展示：Agent 开始、模型分析、Tool 调用、两个 Skill 执行、Tool 返回、最终生成、任务完成。
- [ ] stdout 日志可以通过 `runId` / `traceId` 串起一次执行过程。
- [ ] Run 详情页可以事后复盘一次 Agent Run。
