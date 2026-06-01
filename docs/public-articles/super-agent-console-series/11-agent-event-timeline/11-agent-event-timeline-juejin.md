掘金版
标题
Nuxt3 AI Agent 控制台实战 10：用 AgentEvent 和 Timeline 展示 Agent 执行过程
正文
上一篇完成了双接口结构：

POST /api/conversations/messages
GET /api/agent/runs/:runId/events

第一个接口负责创建 message 和 Agent Run。
第二个接口负责基于 runId 建立 SSE 连接，订阅这次 Run 的执行事件。
这篇继续往下做：
用 AgentEvent 协议和 Timeline，把一次 Agent Run 的执行过程展示出来。

1. SSE 不应该只推最终答案
   一开始做 AI 页面时，SSE 通常只用于模型流式输出：

用户输入
↓
服务端调用模型
↓
SSE 返回文本 delta
↓
前端打字机展示

这适合普通聊天页面。
但 Agent 不只是简单问答。
一次 Agent 执行可能包含：

模型分析
工具调用
工具参数生成
Tool 执行
Skill 执行
中间结果返回
最终答案生成

如果 SSE 只推最终答案，前端看到的仍然是一个黑盒。
所以这里要把 SSE 从“文本流”升级成“事件流”。
也就是：

SSE 推送 AgentEvent
前端根据 eventType 渲染不同区域

2. AgentEvent 结构
   当前定义统一事件协议：

AgentEvent

基础字段包括：

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

几个关键字段：

eventType
表示事件类型，比如 tool_call_start、skill_result。

status
表示当前 Run 状态，比如 running、tool_calling、completed。

sequence
表示事件顺序，前端可按顺序渲染。

data
承载业务数据，比如工具参数、Skill 输出、模型 delta。

这样前端不需要猜测服务端返回的内容。
只要根据 eventType 分发即可。

3. 第一批事件类型
   MVP 阶段先定义这些事件：

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

含义大概是：

agent_start
Agent Run 开始

prompt_loaded
Prompt / 上下文加载完成

model_call_start
开始调用模型

model_text_delta
模型中间分析流式输出

tool_call_start
模型触发工具调用

skill_start
Tool 内部开始执行 Skill

skill_result
Skill 返回结果

tool_call_result
Tool 汇总结果返回

final_answer_delta
最终答案流式输出

agent_done
Agent Run 完成

agent_error
Agent Run 异常

这套事件后续会同时服务：

前端 Timeline
Tool / Skill 卡片
Run 详情页
数据库落库
Redis SSE Replay
CLS 日志

4. model_text_delta 和 final_answer_delta 的区别
   这里我把模型输出分成了两类：

model_text_delta
final_answer_delta

model_text_delta 用于展示模型的中间分析过程。
比如：

我需要先分析岗位 JD 中的技能要求...
接下来需要调用岗位分析工具...

final_answer_delta 用于展示最终给用户看的答案。
比如：

根据这个岗位 JD，你需要重点准备 Nuxt3、Docker、K3S 和 Agent 工程化能力...

这样前端可以把两类内容展示在不同区域。
避免中间分析和最终答案混在一起。

5. 打字机队列
   SSE 推送的 chunk 粒度并不稳定。
   有时一条事件只有几个字。
   有时一条事件是一整句话。
   如果直接把内容追加到页面，展示效果会不稳定。
   所以我做了一个前端通用打字机队列：

SSE 接收 AgentEvent
↓
如果是 delta 事件，写入 queue
↓
定时从 queue 中取字符
↓
逐字追加到展示区

这样无论服务端 chunk 粒度如何，前端都能保持稳定的打字机效果。
当前支持：

model_text_delta
final_answer_delta
tool_progress_delta
skill_progress_delta

6. Tool / Skill 过程输出
   只展示模型流还不够。
   Agent 执行过程中，Tool 和 Skill 也会有中间状态。
   例如 Tool 执行过程：

已命中 Tool
准备执行 workflow
开始执行第一个 Skill
第一个 Skill 已完成
开始执行第二个 Skill
workflow 执行完成

Skill 执行过程：

正在读取 JD 文本
正在匹配技术关键词
正在生成 7 天计划
正在拆分每日任务

所以新增两个事件：

tool_progress_delta
skill_progress_delta

它们用于展示 Tool / Skill 的执行过程。
这样前端能看到的不只是最终 skill_result，还能看到 Skill 正在做什么。

7. 前端展示区域
   当前页面分成三个区域。
   7.1 AI Output
   展示：

模型分析过程
最终答案

主要消费：

model_text_delta
final_answer_delta

7.2 Agent Timeline
按顺序展示一次 Run 的所有关键事件。
例如：

Agent 开始
Prompt 加载完成
模型开始分析
Tool 调用开始
Skill 1 开始
Skill 1 完成
Skill 2 开始
Skill 2 完成
Tool 返回
最终答案生成
Agent 完成

主要消费：

agent_start
prompt_loaded
model_call_start
tool_call_start
skill_start
skill_result
tool_call_result
agent_done
agent_error

7.3 Tool / Skill Process
展示 Tool 和 Skill 的结构化过程。
包括：

Tool 名称
Tool 参数
Skill 输入
Skill progress
Skill 输出
Tool result

这样看起来不是一堆日志，而是一组执行卡片。

8. SSE 速度配置
   Mock Agent Runtime 执行太快时，Timeline 很难看清。
   所以加了一个速度配置。
   支持 URL query：

?sseIntervalMs=1200

也支持 localStorage：

agent:sseIntervalMs

这样调试或录屏时，可以把事件间隔放慢。
比如：

600ms
1200ms
2000ms

对于做演示和排查 Timeline 渲染很有帮助。

9. Loading 状态
   Agent Run 执行过程中，需要让用户知道系统还在运行。
   所以页面增加了 loading 状态。
   比如：

Agent 正在执行
模型正在分析
Tool 正在调用
Skill 正在执行
最终答案生成中

这些 loading 状态由 AgentEvent 驱动。
例如：

tool_call_start
→ Tool 卡片显示执行中

skill_start
→ Skill 卡片显示执行中

skill_result
→ Skill 卡片显示完成

agent_done
→ 整体 Run 完成

这样用户不会误以为页面卡住。

10. Timeline 的意义
    Timeline 不是装饰。
    它是 Agent Console 的核心调试入口。
    没有 Timeline 时，如果 Agent 输出异常，只能看到最终答案。
    有了 Timeline 后，可以判断问题发生在哪一步：

模型分析阶段
工具参数生成阶段
Tool Router 阶段
Skill 执行阶段
Tool 汇总阶段
最终答案生成阶段
前端 SSE 解析阶段

这对后续做 Run 详情页、Redis SSE Replay、数据库落库都很重要。
因为这些能力都依赖同一套 AgentEvent。

11. 当前阶段完成了什么
    这一阶段完成了：

AgentEvent 协议
SSE 事件流
model_text_delta
final_answer_delta
tool_progress_delta
skill_progress_delta
Agent Timeline
Tool / Skill Process 卡片
打字机队列
SSE 速度配置
Run loading 状态

项目从：

只展示最终答案

变成了：

展示一次 Agent Run 的完整执行过程

12. 总结
    普通 AI 聊天页面关注的是：

用户输入
模型回答

Agent Console 更关注的是：

用户输入之后，Agent 到底做了什么

所以 SSE 不应该只返回最终答案。
它应该返回一组结构化 AgentEvent。
前端根据这些事件展示：

模型分析
工具调用
Skill 执行
最终答案
执行状态
错误信息

这就是 Timeline 的价值。
它让 Agent 不再是黑盒。
下一篇继续记录：
如何实现 Tool Schema、Tool Router，以及 Tool 内部的 Skill 编排。
