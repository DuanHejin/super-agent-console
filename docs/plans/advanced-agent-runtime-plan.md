# Advanced Agent Runtime Plan

本阶段目标：在 MVP 核心链路稳定后，补齐更接近生产系统的异步执行、事件回放、上下文管理、动态工具调用和失败控制能力。

完成一个验收点后，将对应任务从 `- [ ]` 改为 `- [x]`。

## Scope

进阶阶段允许改造运行架构，但不做完整平台后台。重点是把 MVP 中的 in-process Agent Runtime 演进成更可恢复、可排查、可扩展的运行链路。

## Checklist

- [ ] 引入 NSQ 异步任务入口。
- [ ] 将 `POST /api/conversations/messages` 改造成只负责创建任务和入队，返回 `status = queued`。
- [ ] 新增 Agent Runtime 消费者，消费 NSQ 后执行 Agent Run。
- [ ] SSE 订阅接口支持展示 `queued`、`running`、`completed` 等异步状态变化。
- [ ] 定义 Redis SSE 事件缓存结构。
- [ ] 将 AgentEvent 写入 Redis，用于断线恢复和回放。
- [ ] 新增 replay 接口：`GET /api/agent/runs/:runId/replay`。
- [ ] replay 接口只回放历史事件，不重新调用模型或工具。
- [ ] 前端支持通过 replay 复现一次 Agent Run 的 Timeline 和流式输出。
- [ ] 引入 conversation 历史消息作为模型上下文。
- [ ] 实现最近 N 轮上下文加载。
- [ ] 实现 tool result 回填到模型上下文。
- [ ] 实现简单 token 预算和上下文裁剪策略。
- [ ] 扩展 Tool Registry，支持多个 Tool。
- [ ] 实现动态 Tool Calling，让模型根据 Tool Schema 选择工具。
- [ ] 新增 Tool：`generateInterviewQuestions`。
- [ ] 新增 Tool：`compareCandidateWithJD`。
- [ ] 新增 Tool：`summarizeLearningGap`。
- [x] 将 Tool → Skill workflow 从硬编码迁移到代码配置文件。
- [x] 预留 Skill workflow 的 input mapping 配置，例如从 `$toolArgs.jdText` 或上一步输出取值。
- [ ] 实现 Skill workflow input mapping 解析器。
- [ ] 实现模型调用超时控制。
- [ ] 实现工具调用超时控制。
- [ ] 实现 Skill 失败重试策略。
- [ ] 实现 Run cancel。
- [ ] 实现 Run retry。
- [ ] 扩展状态机：`queued`、`retrying`、`cancelled`、`timeout`。
- [ ] 扩展数据库表：model_calls、skill_runs、sse_events、workflow_runs。
- [ ] Run 详情页展示模型调用、SSE 原始事件、workflow 过程和重试记录。

## Acceptance

- [ ] 创建消息接口返回后，即使 Agent Runtime 尚未执行，前端也能进入等待状态。
- [ ] NSQ 消费者执行后，前端 SSE 可以收到 queued 到 completed 的完整状态变化。
- [ ] Redis replay 可以复现一次历史 Run，不触发新的模型调用或工具执行。
- [ ] 多个 Tool 可以由模型动态选择，并由服务端完成白名单、schema 校验和路由。
- [ ] Run 可以取消、超时、重试，且状态和事件可追踪。
