掘金版
标题
Nuxt3 AI Agent 控制台实战 09：为什么 Agent 不能只有一个聊天接口
正文
一开始做 AI 页面时，接口设计很简单：

POST /api/chat
→ SSE 返回模型内容

前端提交用户输入，服务端请求大模型，然后通过 SSE 把流式结果返回给前端。
这个设计适合最小聊天 Demo。
但当项目目标变成 Agent Console 后，这个接口设计就不够用了。
因为 Agent 不是一次简单问答，而是一次可追踪的任务执行。
系统需要知道：

当前属于哪个 conversation
当前是哪条 message
当前是哪一次 Agent Run
这次请求是否重复提交
前端应该订阅哪一次 Run 的事件
日志、数据库、前端 Timeline 如何串联

因此，这一篇开始把单接口改造成更接近真实项目的双接口结构。

1. 单接口的问题
   单接口方式：

POST /api/chat

它同时负责：

接收用户输入
创建会话
调用模型
处理工具调用
推送 SSE
返回最终答案

短期看起来简单。
但后面会遇到几个问题：

会话和执行混在一起
无法明确追踪一次 Agent Run
幂等不好处理
SSE 断线后不容易恢复
日志和数据库难以按 run 复盘
前端 Timeline 缺少统一事件来源

所以 Agent 项目里，接口设计不能只围绕“返回答案”。
更应该围绕：

一次 Agent Run

来建模。

2. 拆成两个接口
   现在拆成两个接口。
   2.1 创建消息和 Run

POST /api/conversations/messages

请求参数：

{
"conversationId": "可选，第一轮没有",
"input": "用户输入内容",
"clientRequestId": "前端生成的唯一 ID"
}

返回：

{
"conversationId": "conv_xxx",
"messageId": "msg_xxx",
"runId": "run_xxx",
"traceId": "trace_xxx",
"status": "created"
}

这个接口负责：

创建或复用 conversation
创建 message
创建 Agent Run
处理 clientRequestId 幂等
生成 traceId
返回 runId

2.2 订阅 Run 事件

GET /api/agent/runs/:runId/events

这个接口负责：

基于 runId 建立 SSE 连接
推送当前 Run 的 AgentEvent
推送模型流式输出
推送 Tool / Skill 状态
推送最终结果或错误

整体链路变成：

用户输入
→ 创建 conversation / message / run
→ 返回 runId
→ 前端订阅 runId 对应 SSE
→ 服务端推送 AgentEvent

这样创建任务和订阅任务过程就解耦了。

3. 为什么要拆？
   3.1 创建接口适合做前置逻辑
   例如：

登录态校验
权限校验
参数校验
幂等处理
内容安全检查
会话创建
消息落库
Run 创建

如果这些逻辑和 SSE 混在一起，失败处理会比较复杂。
例如用户未登录、积分不足、参数不合法，这些都应该在创建阶段直接返回普通 JSON，而不是建立 SSE 后再报错。

3.2 SSE 接口只关注事件推送
SSE 接口只需要关心：

这个 runId 是否存在
当前用户是否有权限订阅
如何推送 AgentEvent
连接断开如何处理

它不需要承担复杂业务创建逻辑。
这让接口职责更清晰。

3.3 后续可以接异步队列
如果后续引入 NSQ：

POST /api/conversations/messages
↓
创建 run
↓
发送 NSQ 消息
↓
消费者异步执行 Agent Runtime
↓
SSE 接口订阅 runId 事件

这种双接口设计会更自然。

4. clientRequestId 幂等
   这里加入了一个关键字段：

clientRequestId

它由前端在用户点击发送时生成。
通常可以使用 UUID v4。
服务端用：

userId + clientRequestId

做唯一判断。
如果同一个 clientRequestId 已经创建过 message / run，服务端不再重复创建，而是直接返回之前的结果。
例如第一次请求：

{
"conversationId": "conv_001",
"messageId": "msg_001",
"runId": "run_001"
}

重复请求仍然返回同一组 ID。
这样可以避免因为网络抖动或重复点击导致：

一次用户操作
→ 创建两条 message
→ 创建两个 run
→ 触发两次 Agent 执行
→ SSE 数据混乱

AI 产品里，这个问题会比普通表单更严重。
因为一次重复提交可能会触发：

模型调用
工具调用
Skill 执行
数据库写入
日志记录
SSE 推送

所以幂等是 Agent Run 创建接口里非常重要的一步。

5. ID 体系
   当前一次 Agent 执行里，定义了这些 ID：

conversationId：一段对话
messageId：用户的一条输入
runId：一次 Agent 执行
traceId：日志追踪 ID
toolCallId：一次工具调用
skillRunId：一次 Skill 执行

它们的层级关系可以理解为：

conversation
└── message
└── run
├── toolCall
│ └── skillRun
└── agentEvent

这些 ID 会贯穿：

API response
SSE AgentEvent
前端 Timeline
stdout JSON 日志
数据库记录
Run 详情页

这样后面拿到一个 runId，就可以查询这次执行的完整链路：

用户输入
模型调用
Tool 调用
Skill 执行
最终答案
错误信息
状态变化

6. 状态机设计
   MVP 阶段不引入复杂状态机库。
   先定义一组枚举：

type AgentRunStatus =
| 'created'
| 'running'
| 'model_calling'
| 'tool_calling'
| 'skill_running'
| 'generating'
| 'completed'
| 'failed'

一次正常执行：

created
→ running
→ model_calling
→ tool_calling
→ skill_running
→ generating
→ completed

失败时：

failed

状态变化会影响：

前端 Timeline
Run 详情页
数据库记录
日志
异常处理

状态机的意义不是复杂化代码，而是让 Agent Run 的过程可描述。
没有状态机时，系统通常只关心：

开始
结束

但 Agent 的核心价值在中间过程。

7. AgentEvent 协议
   拆分接口之后，SSE 推送的内容统一成 AgentEvent。
   后续事件可以包括：

agent_start
model_call_start
model_text_delta
tool_call_start
skill_start
skill_result
tool_call_result
final_answer_delta
agent_done
agent_error

每个事件都带：

conversationId
messageId
runId
traceId
timestamp

工具相关事件额外带：

toolCallId
toolName

Skill 相关事件额外带：

skillRunId
skillName

这样前端 Timeline 只需要消费 AgentEvent，就能展示完整执行过程。

8. 当前阶段完成了什么
   这一阶段完成后，项目从：

POST /api/chat
直接返回 SSE

演进为：

POST /api/conversations/messages
创建 message / run

GET /api/agent/runs/:runId/events
订阅 run 事件流

同时补齐了：

clientRequestId 幂等
conversationId / messageId / runId
traceId
基础状态机
Agent Run 建模

这一步没有真正接模型。
但它非常关键。
因为它让后续所有能力都有了核心对象：

Agent Run

9. 总结
   Agent 系统里的接口设计，不能只围绕“返回答案”。
   它应该围绕“一次执行过程”来设计。
   因为：

答案只是结果
Run 才是过程

拆成双接口后，项目具备了更清晰的结构：

创建消息和 Run
↓
订阅 Run 事件
↓
Agent Runtime 执行
↓
SSE 推送 AgentEvent
↓
前端 Timeline 展示
↓
Run 详情页复盘

下一篇继续记录：
如何基于 runId 建立 SSE 订阅，并用 Mock Agent Runtime 推送一套完整的 AgentEvent，让前端 Timeline 先跑起来。
