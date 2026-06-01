codex

# 第三篇：我不想让 AI 黑盒执行，所以给 Agent 做了一条 Timeline

双接口跑通之后，下一步就是 SSE。

一开始我对 SSE 的理解也比较简单：

模型返回一段内容，服务端一点点推给前端，前端做个打字机效果。

但真正开始做 Agent 时，我发现 SSE 不应该只用来推最终答案。

如果只推最终答案，前端看到的还是一个黑盒。

用户输入一句话，然后等一会儿，最后页面出现一段回答。

这个体验和普通聊天框没有本质区别。

但 Agent 真正复杂的地方在中间。

它会分析问题，会决定是否调用工具，会把工具参数传进去，会执行 Skill，会拿到中间结果，再继续生成最终答案。

如果这些过程都不展示出来，那我其实还是不知道 Agent 在干什么。

---

所以我定义了一套统一的事件协议：

```txt
AgentEvent
```

每个事件都带这些字段：

```txt
eventId
eventType
conversationId
messageId
runId
traceId
sequence
status
timestamp
name
data
message
```

其中我最关心的是几个字段：

```txt
eventType：发生了什么
status：当前 Run 处于什么状态
sequence：这是第几个事件
data：这一步的业务数据
```

这样前端拿到事件后，不需要猜。

它只要按 `eventType` 分发处理，就能知道这条事件应该展示在哪里。

---

最开始我定义了一批基础事件：

```txt
agent_start
prompt_loaded
model_call_start
model_text_delta
tool_call_start
skill_start
skill_result
tool_call_result
final_answer_delta
agent_done
agent_error
```

其中：

```txt
model_text_delta
```

用来展示模型分析过程。

```txt
final_answer_delta
```

用来展示最终答案。

这样前端就不是等服务端一次性返回一整段内容，而是能看到模型一点点输出。

后来我又加了打字机效果。

SSE 本身是按 chunk 推送的，但 chunk 的粒度不一定适合直接展示。

有时候一条事件里已经有一整句话，如果直接追加到页面上，会显得比较生硬。

所以我做了一个通用的打字机队列。

SSE 事件先进入队列，前端再按字符渐进展示。

这一步做完后，模型分析区和最终答案区都更像真实 AI 产品了。

---

但光有模型流还不够。

Agent 执行时，Tool 和 Skill 也会有中间态。

比如 Tool 开始执行后，它可能会说：

```txt
已命中 Tool
准备执行 workflow
开始执行第一个 Skill
第一个 Skill 已完成
开始执行第二个 Skill
workflow 执行完成
```

Skill 自己也可能有过程输出：

```txt
正在读取 JD 文本
正在匹配技术关键词
正在生成 7 天计划
正在拆分每日任务
```

这些东西如果只在最后展示结果，也会丢掉很多过程信息。

所以我又补了两个事件：

```txt
tool_progress_delta
skill_progress_delta
```

这样 Tool 和 Skill 的中间态，也能像 `model_text_delta` 一样实时返回前端。

---

前端展示上，我做了三个区域。

第一个是 AI Output。

它展示模型分析和最终答案。

第二个是 Agent Timeline。

它按顺序展示所有事件，让我能看到这次 Run 从开始到结束发生了什么。

第三个是 Tool / Skill Process。

它把 Tool 参数、Skill 输入、Skill 过程输出、Skill 结果、Tool 返回都整理成卡片。

这样看起来就不只是技术日志，而是一个比较清晰的执行面板。

---

这个阶段我还加了两个小功能。

一个是 SSE 速度配置。

因为 mock Agent 执行太快的话，演示时看不清过程。

所以我支持通过 URL query 或 localStorage 调整间隔：

```txt
?sseIntervalMs=1200
agent:sseIntervalMs
```

另一个是 loading 状态。

当 Run 还在执行中时，页面会在合适的位置提示正在运行，而不是让用户以为卡住了。

这些交互都不复杂，但会让 Agent Console 更像一个真实工具，而不是一个临时 Demo。

---

做完这一阶段之后，我对 Agent 前端的理解变了。

以前我觉得 AI 前端重点是输入框和聊天气泡。

现在我觉得，Agent 前端更重要的是过程展示。

因为 Agent 的结果可能不稳定，但过程必须尽量可观察。

如果一个 Agent 执行失败，我至少要知道它失败在哪一步。

是模型分析阶段？
是工具参数生成阶段？
是 Tool Router 阶段？
是 Skill 执行阶段？
还是最终答案生成阶段？

Timeline 的意义就在这里。

它不是装饰，而是调试入口。

也是我后面做 Run 详情页和数据库落库的基础。
