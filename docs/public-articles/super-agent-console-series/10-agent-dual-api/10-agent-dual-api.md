codex

# 第二篇：我终于明白，Agent 为什么不能只有一个聊天接口

一开始做 AI 页面的时候，我脑子里的接口其实很简单。

用户输入一句话，前端调用一个接口，服务端请求大模型，然后把结果通过 SSE 返回给前端。

大概就是：

```txt
POST /api/chat
→ SSE 返回模型内容
```

这个方式很容易理解，也很适合做最小 Demo。

但真正开始复刻公司里的 Agent 项目时，我发现这种接口设计很快就不够用了。

因为 Agent 不是一次简单问答。

它更像是一次可追踪的任务执行。

用户输入之后，系统需要知道：

```txt
这是哪个会话
这是哪条消息
这是哪一次 Agent 执行
这次执行有没有重复提交
前端应该订阅哪一次执行过程
后续日志和数据库怎么串起来
```

如果所有事情都塞进一个接口里，短期看起来简单，后面会越来越乱。

---

所以我把原来的单接口拆成了两个接口。

第一个接口负责创建消息和 Run：

```txt
POST /api/conversations/messages
```

前端发送：

```json
{
    "conversationId": "可选",
    "input": "用户输入内容",
    "clientRequestId": "前端生成的唯一 ID"
}
```

服务端返回：

```json
{
    "conversationId": "conv_xxx",
    "messageId": "msg_xxx",
    "runId": "run_xxx",
    "traceId": "trace_xxx",
    "status": "created"
}
```

第二个接口负责订阅执行过程：

```txt
GET /api/agent/runs/:runId/events
```

也就是说，前端不是直接请求一个聊天接口等结果，而是先创建一次 Agent Run，再用 `runId` 去订阅这次执行的事件流。

这一步改完之后，整个链路就清楚很多了。

```txt
用户输入
→ 创建 conversation / message / run
→ 返回 runId
→ 前端订阅 runId 对应的 SSE
→ 服务端推送 AgentEvent
```

---

这里面我还加了一个以前做业务时经常遇到的问题：幂等。

前端点击发送按钮时，会生成一个：

```txt
clientRequestId
```

服务端用：

```txt
userId + clientRequestId
```

做唯一判断。

如果用户因为网络卡顿连续点了两次发送，服务端不会重复创建两条消息，而是返回同一个 `conversationId`、`messageId` 和 `runId`。

这个点看起来不大，但在真实项目里很重要。

因为 AI 产品里，一次请求可能会触发模型调用、工具调用、数据库写入、日志记录。

如果重复创建，就不只是多了一条消息，而是整条执行链路都重复了。

---

拆成双接口后，我又补了一套基础 ID 体系。

目前一次 Agent 执行里，会有这些 ID：

```txt
conversationId：一段会话
messageId：用户的一条输入
runId：一次 Agent 执行
traceId：日志追踪 ID
toolCallId：一次工具调用
skillRunId：一次 Skill 执行
```

这些 ID 会贯穿：

```txt
API 响应
SSE 事件
前端 Timeline
JSON 日志
数据库记录
Run 详情页
```

这样后面排查问题时，就不会只看到一堆孤立日志。

比如我拿到一个 `runId`，就可以查出这次执行里的用户输入、模型分析、工具调用、Skill 输出、最终答案。

这才像一个可复盘的 Agent 系统。

---

状态机也是这一步一起加的。

MVP 阶段没有引入复杂状态机库，只定义了一组枚举：

```txt
created
running
model_calling
tool_calling
skill_running
generating
completed
failed
```

一次正常执行大概是：

```txt
created
→ running
→ model_calling
→ tool_calling
→ skill_running
→ generating
→ completed
```

为什么要加状态机？

因为没有状态机，前端和服务端很容易只关心“开始”和“结束”。

但 Agent 的价值恰好在中间过程。

我需要知道它当前是在模型分析，还是在调用工具，还是在执行 Skill，还是已经进入最终答案生成。

这些状态后面也会影响前端展示、数据库记录和异常处理。

---

这个阶段做完之后，我最大的感受是：

Agent 系统里的接口设计，不能只围绕“返回答案”来设计。

它应该围绕“一次执行”来设计。

因为答案只是结果，Run 才是过程。

以前写普通业务接口时，我更关心请求和响应。

现在做 Agent，我开始更关心：

```txt
这次任务是谁创建的
执行到哪一步了
中间发生了什么
失败时停在哪里
能不能重新看一遍
```

所以这一步虽然没有接真实模型，但对整个项目很关键。

它让前端、服务端、日志、数据库都有了同一个核心对象：

```txt
Agent Run
```

后面所有东西，都会围绕它继续往下长。
