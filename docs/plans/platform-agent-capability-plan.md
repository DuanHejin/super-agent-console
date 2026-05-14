# Platform Agent Capability Plan

本阶段目标：在核心链路和进阶运行能力稳定后，再补平台化能力，包括配置中心、Trace / Eval、配置后台、可视化工作流、多模型、RAG、Memory 和审计。

完成一个验收点后，将对应任务从 `- [ ]` 改为 `- [x]`。

## Scope

高阶阶段不是当前求职 Demo 的第一优先级。只有当 MVP 和进阶链路都稳定后，才逐步引入这些平台化能力。

## Checklist

- [ ] 设计 Nacos 配置分层，明确哪些配置从 `.env` / ConfigMap / Secret 迁移到 Nacos。
- [ ] 接入 Nacos 读取模型配置。
- [ ] 接入 Nacos 读取 Prompt 配置。
- [ ] 接入 Nacos 读取 Tool 开关和服务地址。
- [ ] 保留本地开发 fallback，避免 Nacos 不可用时阻断开发。
- [ ] 设计轻量 Coze Loop / Trace 上报适配层。
- [ ] 将 AgentRun、ModelCall、ToolCall、SkillRun 的关键节点上报到 Trace 系统。
- [ ] 建立 Prompt 调试记录和版本信息。
- [ ] 建立基础评测集，用于比较不同 Prompt / 模型的输出效果。
- [ ] 设计 Tool / Skill 配置后台的数据模型。
- [ ] 后台支持维护 Tool Schema。
- [ ] 后台支持维护 Skill Definition。
- [ ] 后台支持维护 Prompt Template。
- [ ] 后台支持维护 Workflow 编排、版本、启停和灰度规则。
- [ ] 设计可视化 Workflow 数据结构。
- [ ] 实现代码化 workflow 与可视化 workflow 的互相转换边界。
- [ ] 支持火山方舟平台 Adapter：VolcengineArkAdapter。
- [ ] 支持在同一平台内切换具体模型，例如 Seed 2.0 Lite、Seed 2.0 Pro、DeepSeek。
- [ ] 支持多模型 Adapter：DeepSeekAdapter。
- [ ] 支持多模型 Adapter：QwenAdapter。
- [ ] 支持 OpenAICompatibleAdapter。
- [ ] 支持模型切换和快速回滚。
- [ ] 支持 Prompt A/B 测试。
- [ ] 接入向量数据库。
- [ ] 实现基础 RAG：文档切片、embedding、检索、上下文注入。
- [ ] 实现 RAG 效果排查工具，展示 query、topK、命中文档、最终注入上下文。
- [ ] 实现长期 Memory 数据模型。
- [ ] 区分 Memory 与 RAG 的读取和写入边界。
- [ ] 引入权限、计费、审计的最小模型。
- [ ] 设计多副本事件分发方案，解决多实例 SSE 订阅与 Agent Runtime 不在同一进程的问题。

## Acceptance

- [ ] 模型、Prompt、Tool 开关等运行参数可以从配置中心读取，并有本地 fallback。
- [ ] 一次 Agent Run 可以在 Trace 系统中看到模型调用、工具调用、Skill 执行和错误信息。
- [ ] Tool / Skill / Prompt / Workflow 的核心配置可以通过后台维护。
- [ ] 多模型 Adapter 可以切换模型并保留统一调用接口。
- [ ] RAG 可以解释“检索了什么、为什么效果不好、最终注入了什么上下文”。
- [ ] Memory 与 RAG 的职责边界清晰，不互相混用。
