知乎版
标题
我终于明白，Agent 为什么不能只有一个聊天接口
正文
一开始做 AI 页面的时候，我脑子里的接口其实很简单。
用户输入一句话，前端调用一个接口，服务端请求大模型，然后把结果通过 SSE 返回给前端。
大概就是：

POST /api/chat
→ SSE 返回模型内容

这个方式很容易理解，也很适合做最小 Demo。
一个输入框，一个发送按钮，一个接口，一个展示区。
很快就能跑起来。
但真正开始复刻公司里的 Agent 项目时，我发现这种接口设计很快就不够用了。
因为 Agent 不是一次简单问答。
它更像是一次可以被追踪、观察和复盘的任务执行。
用户输入之后，系统需要知道：

这是哪个会话
这是哪条消息
这是哪一次 Agent 执行
这次执行有没有重复提交
前端应该订阅哪一次执行过程
后续日志和数据库怎么串起来

如果所有事情都塞进一个接口里，短期看起来简单，后面会越来越乱。

从一个接口拆成两个接口
所以我把原来的单接口拆成了两个接口。
第一个接口负责创建消息和 Run：

POST /api/conversations/messages

前端发送：

{
"conversationId": "可选",
"input": "用户输入内容",
"clientRequestId": "前端生成的唯一 ID"
}

服务端返回：

{
"conversationId": "conv_xxx",
"messageId": "msg_xxx",
"runId": "run_xxx",
"traceId": "trace_xxx",
"status": "created"
}

第二个接口负责订阅执行过程：

GET /api/agent/runs/:runId/events

也就是说，前端不是直接请求一个聊天接口等结果。
而是先创建一次 Agent Run，再用 runId 去订阅这次执行的事件流。
这一步改完之后，整个链路就清楚很多：

用户输入
→ 创建 conversation / message / run
→ 返回 runId
→ 前端订阅 runId 对应的 SSE
→ 服务端推送 AgentEvent

为什么要这么拆？
以前我会觉得，一个接口直接返回 SSE 就够了。
但 Agent 项目里，创建任务和订阅结果其实是两件事。
创建消息接口更适合做：

登录态校验
权限校验
参数校验
幂等处理
会话创建
消息落库
Run 创建
返回 runId

而 SSE 接口更适合专注做一件事：

基于 runId 推送这次 Agent Run 的执行事件

这两个职责如果混在一起，刚开始没问题。
但后面一旦有状态机、日志、数据库、重试、队列、断线重连，就会变得不清楚。
拆开之后，前端和服务端都更容易理解：

第一个接口：创建任务
第二个接口：订阅任务过程

幂等：一个看起来很小但很真实的问题
这里面我还加了一个以前做业务时经常遇到的问题：幂等。
前端点击发送按钮时，会生成一个：

clientRequestId

服务端用：

userId + clientRequestId

做唯一判断。
如果用户因为网络卡顿连续点了两次发送，服务端不会重复创建两条消息，而是返回同一个 conversationId、messageId 和 runId。
这个点看起来不大，但在真实项目里很重要。
因为 AI 产品里，一次请求可能会触发：

模型调用
工具调用
Skill 执行
数据库写入
日志记录
SSE 推送

如果重复创建，就不只是多了一条消息。
而是整条 Agent 执行链路都重复了。
这也是我之前在公司项目里见过的真实问题：
用户看起来只点了一次，但因为网络抖动或请求重试，服务端创建了两次会话，后面的数据就容易混乱。
所以，幂等不是为了设计得复杂。
而是为了让“一次用户操作”只对应“一次 Agent Run”。

一套基础 ID 体系
拆成双接口后，我又补了一套基础 ID 体系。
目前一次 Agent 执行里，会有这些 ID：

conversationId：一段会话
messageId：用户的一条输入
runId：一次 Agent 执行
traceId：日志追踪 ID
toolCallId：一次工具调用
skillRunId：一次 Skill 执行

这些 ID 会贯穿：

API 响应
SSE 事件
前端 Timeline
JSON 日志
数据库记录
Run 详情页

这样后面排查问题时，就不会只看到一堆孤立日志。
比如拿到一个 runId，就可以查出这次执行里的：

用户输入
模型分析
工具调用
Skill 输出
最终答案
错误信息
执行状态

这才像一个可复盘的 Agent 系统。

状态机：不只关心开始和结束
状态机也是这一步一起加的。
MVP 阶段没有引入复杂状态机库，只定义了一组枚举：

created
running
model_calling
tool_calling
skill_running
generating
completed
failed

一次正常执行大概是：

created
→ running
→ model_calling
→ tool_calling
→ skill_running
→ generating
→ completed

为什么要加状态机？
因为没有状态机，前端和服务端很容易只关心“开始”和“结束”。
但 Agent 的价值恰好在中间过程。
我需要知道它当前是在模型分析，还是在调用工具，还是在执行 Skill，还是已经进入最终答案生成。
这些状态后面也会影响：

前端 Timeline 展示
数据库记录
日志输出
异常处理
Run 详情复盘

所以，状态机不是为了炫技。
它是为了让一次 Agent Run 的过程可描述、可追踪、可恢复。

Agent 接口设计，应该围绕 Run
这个阶段做完之后，我最大的感受是：
Agent 系统里的接口设计，不能只围绕“返回答案”来设计。
它应该围绕“一次执行”来设计。
因为答案只是结果。
Run 才是过程。
以前写普通业务接口时，我更关心请求和响应：

请求进来
业务处理
返回结果

现在做 Agent，我开始更关心：

这次任务是谁创建的
执行到哪一步了
中间发生了什么
失败时停在哪里
能不能重新看一遍

所以这一步虽然没有接真实模型，但对整个项目很关键。
它让前端、服务端、日志、数据库都有了同一个核心对象：

Agent Run

后面所有东西，都会围绕它继续往下长。

最后
这是我从普通 AI 聊天页面，开始进入 Agent 系统设计的第一步。
不是先接模型，也不是先写复杂工具。
而是先把最基本的执行对象建出来：

conversation
message
run
trace
event
status

从这一步开始，我才真正理解：
一个 Agent 项目，不只是把用户输入发给模型。 它更重要的是，把一次智能体执行过程建模出来。
下一篇，我会继续记录：
如何基于这个 runId 建立 SSE 订阅，并用 Mock Agent Runtime 推送一套完整的 AgentEvent，让前端 Timeline 先跑起来。
