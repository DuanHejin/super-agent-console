掘金版
标题
Nuxt3 AI Agent 控制台实战 12：实现 Run 详情页，复盘一次 Agent 执行过程
正文
前面已经完成了：

双接口结构
AgentEvent 协议
SSE 事件流
Agent Timeline
Tool / Skill Process 展示

这让前端可以实时看到一次 Agent Run 的执行过程。
但实时 Timeline 还有一个问题：
它更适合现场观看，不适合事后复盘。
如果一次 Run 已经结束，或者后面要排查问题，就需要一个可以根据 runId 查看完整执行过程的页面。
所以这一篇实现 Run 详情页：

/runs/:runId

1. 为什么需要 Run 详情页？
   Agent 执行过程里，问题可能出现在很多地方。
   比如最终答案不理想，原因可能是：

用户输入不完整
模型分析方向偏了
Tool 参数生成错误
Tool Router 路由错误
Skill 输入映射错误
Skill 输出结构不合理
Tool Result 回填异常
最终回答没有正确使用工具结果

如果只有最终答案，很难定位问题。
所以需要一个页面能完整展示：

这次 Run 的输入是什么
状态是什么
触发了哪些 AgentEvent
调用了哪些 Tool
执行了哪些 Skill
每一步输入输出是什么
最终答案是什么
错误信息是什么

这就是 Run 详情页要解决的问题。

2. 页面路径
   当前页面路径：

/runs/:runId

从首页执行完一次 mock run 后，可以通过运行元信息里的入口跳转到详情页。
例如：

/runs/run_xxx

页面会根据 runId 获取本次执行详情。

3. 页面展示内容
   Run 详情页主要展示：

用户输入
runId
traceId
Run 状态
AgentEvent 列表
Tool 调用过程
Skill 执行过程
最终答案
错误信息

可以拆成几个区域。
3.1 Run Overview
展示基础信息：

runId
conversationId
messageId
traceId
status
createdAt
updatedAt

这部分用于快速确认当前查看的是哪一次 Agent 执行。

3.2 User Input
展示用户原始输入。
例如：

请分析这个岗位 JD，并生成 7 天面试准备计划

这个信息很重要。
因为后面所有模型分析、Tool 调用、Skill 结果都应该围绕这个输入产生。

3.3 AgentEvent Timeline
展示事件列表：

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

每条事件包含：

eventType
sequence
status
timestamp
message
data

这样可以按时间顺序复盘一次 Run。

3.4 Tool / Skill Process
展示 Tool 和 Skill 的结构化过程。
例如：

Tool: analyzeJobAndGeneratePlan
arguments:
jdText: ...
candidateProfile: ...

Skill: extractJobRequirementsSkill
input: ...
output: ...

Skill: generateSevenDayPlanSkill
input: ...
output: ...

toolResult: ...

这部分比普通日志更适合排查 Agent 执行问题。

3.5 Final Answer
展示最终答案。
如果最终答案由多个 final_answer_delta 组成，可以在详情页里聚合成完整文本。

3.6 Error Panel
如果 Run 失败，展示错误信息：

errorType
errorMessage
failedStep
stack，可选

这样可以知道失败发生在哪一步。

4. Run 详情页是轻量版 Trace
   这个页面可以理解成轻量版 Agent Trace。
   公司项目中可能会接 Coze Loop 或其他可观测平台。
   这些平台可以记录：

模型调用
Prompt
Tool Call
Skill Run
输入输出
耗时
错误
评测结果

但 MVP 阶段不需要一开始接完整平台。
当前先做一个最小版：

Run 详情页
AgentEvent 列表
Tool / Skill 过程卡片
最终答案展示
错误信息展示

这样可以先理解 Trace 的数据结构和价值。
后续如果接 Coze Loop，就知道哪些数据应该上报。

5. 从内存 run-store 到数据库
   最开始，Run 详情页读取的是内存 run-store。
   也就是：

服务运行期间保存 run 数据
页面根据 runId 查询内存

这个方式适合快速验证。
但它有明显问题：

服务重启数据丢失
多实例之间不共享
不能长期复盘
不能做统计
不能支持 replay

所以后续改成：

优先查询数据库
查不到时 fallback 到内存 run-store

这样做有两个好处。
第一，不影响当前 mock SSE 演示。
第二，可以逐步引入持久化能力。
过渡结构可以理解为：

GET /api/agent/runs/:runId
↓
查询数据库
↓
如果存在，返回数据库记录
↓
如果不存在，查询内存 run-store
↓
返回 fallback 数据

6. 数据库可以怎么设计？
   MVP 阶段可以先设计几张基础表。
   agent_runs
   记录一次 Agent 执行：

id
conversationId
messageId
runId
traceId
status
input
finalAnswer
error
createdAt
updatedAt

agent_events
记录事件流：

id
runId
traceId
eventType
sequence
status
name
message
data
createdAt

tool_calls
记录工具调用：

id
runId
toolCallId
toolName
arguments
result
status
startedAt
finishedAt

skill_runs
记录 Skill 执行：

id
runId
toolCallId
skillRunId
skillName
input
output
status
startedAt
finishedAt

第一版不一定全部做完。
但 Run 详情页的数据结构可以按这个方向设计。

7. runId 和 traceId
   这个阶段开始更重视 traceId。
   runId 表示一次 Agent 执行。
   traceId 更偏排查链路。
   例如：

runId：run_001
traceId：trace_abc

在这些地方都带上：

API 响应
SSE AgentEvent
数据库记录
stdout JSON 日志
前端页面
CLS 日志

这样排查问题时可以串联：

前端看到 runId
↓
Run 详情页看到 traceId
↓
CLS 中搜索 traceId
↓
数据库中查询 agent_events

这让日志、数据库和前端页面不再是分散信息。

8. 为什么可观察性要从 MVP 开始做？
   Agent 系统的复杂度比普通接口高。
   普通接口通常是：

请求
处理
响应

Agent Run 可能是：

用户输入
模型分析
Tool Calling
Skill Workflow
Tool Result
模型最终生成
SSE 推送

中间每一步都可能出问题。
如果 MVP 阶段不记录这些过程，后面接真实模型、真实工具、Redis Replay、NSQ 异步任务时，排查会非常痛苦。
所以可观察性不是上线后再补。
它应该从 AgentEvent 和 Run 详情页开始。

9. 当前阶段完成了什么
   这一阶段完成了：

/runs/:runId 页面
Run Overview
User Input 展示
AgentEvent 列表
Tool / Skill Process 卡片
Final Answer 展示
Error Panel
数据库优先、内存 fallback 的查询策略
runId / traceId 串联

项目从：

实时 Timeline

扩展成：

实时 Timeline + 事后 Run 详情复盘

10. 总结
    Timeline 解决的是：

Agent 正在执行时，我能不能看到过程？

Run 详情页解决的是：

Agent 执行结束后，我能不能复盘过程？

这两个能力共同组成了一个轻量版 Agent Trace。
当前版本没有直接接 Coze Loop，而是先在项目内做一个最小观测闭环。
这样更符合 MVP 阶段：

先理解数据
先跑通链路
先让过程可见
再考虑平台化工具

Agent Console 的价值不是只展示答案。
而是让一次 Agent Run 从输入、执行、工具调用、Skill 输出到最终答案，都能被观察和复盘。
