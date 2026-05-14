# 前端 Agent 开发说明

## 适用范围

本文档覆盖 Nuxt 页面、Vue 组件，以及 Agent Console UI 相关的 composable。

## 职责边界

- 首屏应聚焦可用的 Agent Console，不做营销式落地页。
- AgentEvent 数据需要在三个位置呈现：AI 流式输出区、Agent Timeline、运行元信息。
- 状态归属保持简单：composable 负责协调 API/SSE 状态，组件只负责渲染 UI 状态。
- 流式事件里出现 `runId` 和 `traceId` 时，前端必须保留并展示。

## 当前入口

- `pages/index.vue`：首页外壳。
- `pages/login.vue`：访问码登录页，支持填写可选昵称；昵称会写入签名 cookie，用于后续反馈归属识别。
- `pages/deploy.vue`：部署信息页面。
- `pages/conversations/index.vue`：Conversation 列表页，展示会话摘要和最新 Run 入口；本地 Nuxt dev 环境或管理员登录后开放。
- `pages/runs/index.vue`：Run 列表页，展示最近 Agent Run 并支持进入详情页；本地 Nuxt dev 环境或管理员登录后开放。
- `components/AgentConsole.vue`：Agent Console 容器。
- `components/FeedbackWidget.vue`：全局反馈浮层和回到顶部按钮，登录页不展示。
- `composables/useAgentRun.ts`：Run 状态编排。先创建 conversation message / Agent Run，再订阅 run 事件流。
- `composables/useSseStream.ts`：`GET /api/agent/runs/:runId/events` 的 SSE 读取器。
- `composables/useToolSkillProcess.ts`：将 Tool / Skill AgentEvent 转成前端过程展示 view model。
- `pages/runs/[runId].vue`：Run 详情页，用于事后复盘一次 Agent Run。

## Agent Run 流程

1. 前端每次发送时生成一个 `clientRequestId`。
2. 前端调用 `POST /api/conversations/messages`，传入 `conversationId`、`input` 和 `clientRequestId`。
3. 服务端返回 `conversationId`、`messageId`、`runId`、`traceId` 和 `status`。
4. 前端订阅 `GET /api/agent/runs/:runId/events`。
5. 流式 AgentEvent 更新 Timeline、输出区和运行元信息。
6. `model_text_delta` 更新模型分析流，`tool_progress_delta` / `skill_progress_delta` 更新 Tool 和 Skill 中间态输出，`final_answer_delta` 更新最终答案流。
7. Tool / Skill 事件会转成过程卡片，展示 Tool 参数、Tool 过程输出、Skill 输入、Skill 过程输出、Skill 输出和 Tool 返回。
8. SSE 速度可配置：优先使用页面 query `?sseIntervalMs=1200`，其次使用浏览器 localStorage key `agent:sseIntervalMs`；取值会限制在 100-5000 ms。
9. 打字机效果由 `composables/useTypewriterQueue.ts` 处理；SSE chunk 应进入队列，而不是直接赋值给展示文本。
10. 当 run 处于 `running` 时，在输出区和 Timeline 附近显示轻量 loading，不阻塞整个控制台。
11. 执行结束后可从运行元信息进入 `/runs/:runId`，查看用户输入、事件列表、Tool / Skill 过程和最终答案。

## UI 规则

- 控件保持紧凑、偏工作台风格。
- MVP 阶段避免引入复杂 UI 库。
- 移动端不能出现文本溢出。
- 优先使用清晰的事件/状态标签，不做过度装饰。

## 修改前检查

- 先阅读 `super_agent_console_codex_requirement.md`。
- 完成有意义的项目改动后，检查并更新 `timeline.md`。
- 前端改动必须和 `types/agent-event.ts` 中的 AgentEvent 协议保持一致。
- 展示服务端 ISO 时间时，统一转换为浏览器本地时间，不直接显示 UTC ISO 字符串。
- 模型最终回答使用 `MarkdownContent` 展示 Markdown，底层通过 `showdown` 转换，并在转换前转义原始 HTML。
- 全局反馈入口挂在 `app.vue`，不要在具体页面重复挂载；反馈提交到 `POST /api/feedback`，会把登录时填写的可选昵称同步写入 Feedback 表，回到顶部按钮在滚动超过 480px 后展示。
- 首页 Run 列表和 Conversation 列表入口在本地开发环境直接展示；线上只有管理员访问码登录后展示，避免朋友试用环境看到全局历史数据。
