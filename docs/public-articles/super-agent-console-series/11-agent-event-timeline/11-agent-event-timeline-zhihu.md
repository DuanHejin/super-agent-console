知乎版
标题
我不想让 AI 黑盒执行，所以给 Agent 做了一条 Timeline
正文
双接口跑通之后，下一步就是 SSE。
一开始我对 SSE 的理解也比较简单：
模型返回一段内容，服务端一点点推给前端，前端做个打字机效果。
这也是很多 AI 聊天页面最常见的实现方式。
用户输入一句话，模型开始生成，页面上文字一点点出现。
但真正开始做 Agent 之后，我发现 SSE 不应该只用来推最终答案。
如果只推最终答案，前端看到的还是一个黑盒。
用户输入一句话，然后等一会儿，最后页面出现一段回答。
这个体验和普通聊天框没有本质区别。
但 Agent 真正复杂的地方，恰好在中间过程。
它会分析问题，会判断是否调用工具，会生成工具参数，会执行 Tool，Tool 内部还可能继续编排多个 Skill，拿到中间结果之后，再继续生成最终答案。
如果这些过程都不展示出来，那我其实还是不知道 Agent 在干什么。
所以这一阶段，我开始给 Agent 做一条 Timeline。

先定义一套 AgentEvent
我先定义了一套统一的事件协议：

AgentEvent

每个事件都会带上这些基础字段：

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

其中我最关心的是几个字段：

eventType：发生了什么
status：当前 Run 处于什么状态
sequence：这是第几个事件
data：这一步的业务数据

这样前端拿到事件后，不需要猜。
它只要按 eventType 分发处理，就能知道这条事件应该展示在哪里。
比如：

model_text_delta

就展示到模型分析区。

tool_call_start

就展示到 Timeline。

skill_result

就展示到 Skill 结果卡片。
这样，服务端推送的不再是一堆没有结构的文本，而是一组可以被前端理解的事件。

第一批基础事件
最开始，我定义了一批基础事件：

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

其中：

model_text_delta

用来展示模型分析过程。

final_answer_delta

用来展示最终答案。
也就是说，我把模型输出分成了两类：

中间分析
最终回答

这很重要。
因为在 Agent 项目里，模型可能不是一上来就直接输出最终答案。
它可能先分析用户问题，再决定是否调用工具，然后再基于工具结果生成最终回答。
如果不区分中间分析和最终答案，前端展示就容易混乱。

给流式输出加打字机队列
SSE 本身是按 chunk 推送的。
但 chunk 的粒度不一定适合直接展示。
有时候一条事件里已经有一整句话，如果直接追加到页面上，会显得比较生硬。
所以我做了一个通用的打字机队列。
SSE 事件先进入队列，前端再按字符渐进展示。
这样模型分析区和最终答案区，都能有比较自然的流式效果。
这一步做完后，页面看起来就更像真实 AI 产品了。
但这还不够。
因为 Agent 的中间过程不只有模型输出，还有 Tool 和 Skill 的执行过程。

Tool 和 Skill 也需要中间态
Agent 执行时，Tool 和 Skill 也会有中间态。
比如 Tool 开始执行后，它可能会经历这些步骤：

已命中 Tool
准备执行 workflow
开始执行第一个 Skill
第一个 Skill 已完成
开始执行第二个 Skill
workflow 执行完成

Skill 自己也可能有过程输出：

正在读取 JD 文本
正在匹配技术关键词
正在生成 7 天计划
正在拆分每日任务

这些过程如果只在最后展示结果，就会丢掉很多信息。
所以我又补了两个事件：

tool_progress_delta
skill_progress_delta

这样 Tool 和 Skill 的中间态，也能像 model_text_delta 一样实时返回前端。
这一步做完之后，Agent 不再只是“最后给一个答案”。
它的执行过程开始变得可见。

前端分成三个展示区域
前端展示上，我做了三个区域。
第一个是：

AI Output

它展示模型分析和最终答案。
第二个是：

Agent Timeline

它按顺序展示所有事件，让我能看到这次 Run 从开始到结束发生了什么。
第三个是：

Tool / Skill Process

它把 Tool 参数、Skill 输入、Skill 过程输出、Skill 结果、Tool 返回都整理成卡片。
这样看起来就不只是技术日志，而是一个比较清晰的执行面板。
我希望自己打开页面后，不只是看到一段 AI 回答，而是能看到：

这次 Agent 什么时候开始
模型什么时候开始分析
什么时候决定调用工具
调用了哪个 Tool
Tool 内部执行了哪些 Skill
每个 Skill 产出了什么
最后模型如何生成答案

这才是 Agent Console 应该提供的价值。

两个小交互
这个阶段我还加了两个小功能。
第一个是 SSE 速度配置。
因为 mock Agent 执行太快的话，演示时看不清过程。
所以我支持通过 URL query 或 localStorage 调整间隔：

?sseIntervalMs=1200
agent:sseIntervalMs

这样我可以在演示时故意放慢事件推送速度，让 Timeline 的变化更明显。
第二个是 loading 状态。
当 Run 还在执行中时，页面会在合适的位置提示正在运行，而不是让用户以为卡住了。
这些交互都不复杂。
但它们会让 Agent Console 更像一个真实工具，而不是一个临时 Demo。

我对 AI 前端的理解变了
做完这一阶段之后，我对 Agent 前端的理解变了。
以前我觉得 AI 前端重点是：

输入框
聊天气泡
打字机效果

现在我觉得，Agent 前端更重要的是：

过程展示
状态解释
工具调用可视化
错误定位
执行复盘

因为 Agent 的结果可能不稳定，但过程必须尽量可观察。
如果一个 Agent 执行失败，我至少要知道它失败在哪一步。
比如：

是模型分析阶段？
是工具参数生成阶段？
是 Tool Router 阶段？
是 Skill 执行阶段？
还是最终答案生成阶段？

Timeline 的意义就在这里。
它不是装饰。
它是调试入口。
也是我后面做 Run 详情页和数据库落库的基础。

最后
这一步没有接入复杂模型，也没有做真实 Tool Calling。
但它让我第一次看到了一次 Agent Run 的完整过程。
从：

用户输入

到：

agent_start
model_text_delta
tool_call_start
skill_start
skill_result
tool_call_result
final_answer_delta
agent_done

整条链路开始在页面上可见。
这也是我做 Agent Console 的核心原因。
我不想让 AI 黑盒执行。
我希望每一次 Agent Run，都能被看见、被理解、被复盘。
下一篇，我会继续记录：
如何在 Timeline 跑通之后，开始实现 Tool Schema、Tool Router，以及 Tool 内部的 Skill 编排。
