掘金版
标题
Nuxt3 AI Agent 控制台实战 11：实现 Tool Schema、Tool Router 和 Skill Workflow
正文
做 Agent 绕不开工具调用。
一开始我对 tool call 的理解比较简单：

模型返回工具名和参数
↓
服务端找到对应函数执行
↓
把结果返回给模型

但真正写代码时会发现，如果直接把所有逻辑写成一个函数，短期能跑，后续会很难维护。
这里至少需要拆成三层：

Tool Schema
Tool Router
Skill Workflow

这一篇记录如何在 Nuxt3 服务端里实现一版轻量 Tool / Skill 架构。

1. Tool Schema
   第一个 Tool 定义为：

analyzeJobAndGeneratePlan

它的作用是：

分析岗位 JD，并生成 7 天面试准备计划

参数包括：

jdText
candidateProfile

Tool Schema 的作用有三点。
1.1 告诉模型工具能做什么
模型需要通过 Tool Schema 知道当前有哪些工具可用。
比如：

{
name: 'analyzeJobAndGeneratePlan',
description: '分析岗位 JD，并生成 7 天面试准备计划',
parameters: {
type: 'object',
properties: {
jdText: {
type: 'string',
description: '岗位 JD 原文'
},
candidateProfile: {
type: 'string',
description: '候选人背景信息'
}
},
required: ['jdText']
}
}

模型看到这个 schema 后，才知道可以调用这个工具，以及需要传什么参数。

1.2 告诉服务端参数结构
Tool Schema 不只是给模型看的。
服务端也需要基于 schema 校验参数。
比如：

jdText 是否存在
jdText 是否是 string
candidateProfile 是否符合预期类型

模型返回的内容不能直接信任。
必须先校验，再执行。

1.3 给未来配置后台留边界
当前 Tool Schema 先写在 TS 配置里。
后续可以迁移到配置后台。
所以第一版就不要把工具定义写死在 Runtime 中。

2. Tool Router
   模型返回 tool call 后，服务端不能直接执行。
   Tool Router 要先处理一组边界逻辑：

检查 toolName 是否在白名单
检查 Tool 是否启用
校验 arguments 是否符合 schema
找到对应 Tool handler
执行 Tool

可以理解成：

模型返回调用意图
↓
Tool Router 决定是否允许执行
↓
Tool Handler 执行真实能力

Tool Router 是模型和真实业务能力之间的安全边界。
原因是模型可能返回：

不存在的工具名
缺字段的参数
类型错误的参数
不该调用的工具

所以服务端必须控制执行权。

3. Tool 和 Skill 的分层
   这次没有把 Tool 写成一个大函数。
   而是让 Tool 内部编排多个 Skill。
   当前结构：

Tool: analyzeJobAndGeneratePlan
→ Skill 1: extractJobRequirementsSkill
→ Skill 2: generateSevenDayPlanSkill

Skill 1 负责从 JD 中提取结构化信息：

必备技能
加分项
岗位职责
风险点

Skill 2 负责根据提取结果生成计划：

第 1 天做什么
第 2 天做什么
后续如何准备

这样拆分之后：

Tool 是模型可调用的高层能力入口
Skill 是 Tool 内部可组合的具体能力单元

后续如果要扩展能力，只需要新增 Skill，或者调整 Tool 内部 workflow，而不是把所有逻辑堆在一个 handler 里。

4. 配置目录设计
   当前 Tool、Skill、Workflow、Model 配置都先放在 TS 文件里：

server/agent-config/tools.ts
server/agent-config/skills.ts
server/agent-config/workflows.ts
server/agent-config/models.ts

职责大概是：

tools.ts
定义 Tool Schema、toolName、handlerKey、enabled 等信息

skills.ts
定义 Skill Definition、inputSchema、outputSchema、promptTemplate 等信息

workflows.ts
定义 Tool 内部要执行哪些 Skill，以及数据如何流转

models.ts
定义 mock / real model provider 配置

这一步的目的不是过度设计。
而是让 Agent Runtime 只关心执行流程，不关心具体 Tool 内部有哪些 Skill。

5. Skill Workflow
   Tool 内部 Skill 编排通过 workflow 配置描述。
   例如：

analyzeJobAndGeneratePlan
→ extractJobRequirementsSkill
→ generateSevenDayPlanSkill

这里需要解决一个问题：
上一个 Skill 的输出，如何传给下一个 Skill？
所以实现了一个轻量 input mapping。
比如：

$toolArgs.jdText

表示从 Tool 入参中取 jdText。

$steps.extract-requirements.output

表示从某个 Skill 的输出中取结果。
这样 workflow 可以描述数据流向：

Tool Arguments
↓
Skill 1 Input
↓
Skill 1 Output
↓
Skill 2 Input
↓
Tool Result

MVP 阶段不做复杂 DAG。
先支持顺序执行 + 简单 input mapping。
这已经足够支撑当前 Agent Demo。

6. Agent Runtime 不应该知道 Skill 细节
   这一点很重要。
   Agent Runtime 的职责应该是：

创建 run
推动状态流转
调用模型
解析 tool_call
调用 Tool Router
emit AgentEvent
SSE 推送
日志和落库

它不应该写死：

先执行 extractJobRequirementsSkill
再执行 generateSevenDayPlanSkill

这些应该放在 Tool Workflow 配置里。
这样后续调整 Tool 内部流程时，不需要改 Runtime 主流程。

7. Tool / Skill 过程事件
   一开始只展示 Skill 的输入和输出。
   但真实执行时，Tool 和 Skill 也会有中间态。
   所以新增了两个事件：

tool_progress_delta
skill_progress_delta

用于展示执行过程。
例如 Tool 过程：

已命中 Tool
准备执行 workflow
开始执行第一个 Skill
第一个 Skill 已完成
开始执行第二个 Skill
workflow 执行完成

Skill 过程：

正在读取 JD 文本
正在匹配技术关键词
正在整理岗位要求
正在生成 7 天计划

这样前端 Timeline 看到的不只是：

skill_start
skill_result

而是能看到更细的执行过程。

8. 当前事件流
   一次 mock tool call 的事件流大概是：

agent_start
model_call_start
model_text_delta
tool_call_start
tool_progress_delta
skill_start
skill_progress_delta
skill_result
skill_start
skill_progress_delta
skill_result
tool_call_result
final_answer_delta
agent_done

这套事件后续可以同时用于：

前端 Timeline
Tool / Skill Process 面板
Run 详情页
Redis SSE Replay
数据库落库
CLS 日志

9. 职责拆分
   当前实现后，职责变得比较清楚。

LLM
负责判断是否需要调用工具，以及生成 tool_call 参数

Tool Router
负责工具白名单、启停检查、schema 校验和 handler 路由

Tool
负责承载一个高层业务能力，比如分析 JD 并生成计划

Workflow
负责 Tool 内部多个 Skill 的编排和数据流转

Skill
负责具体任务能力，比如提取岗位要求、生成计划

Agent Runtime
负责驱动整个 run 的执行、状态流转、SSE、日志和落库

一句话：

LLM 负责决策
Tool Router 负责边界
Workflow 负责编排
Skill 负责具体能力
Runtime 负责调度

10. 当前阶段完成了什么
    这一阶段完成了：

Tool Schema
Tool Registry
Tool Router
Tool 参数校验
Tool Handler
Skill Definition
Skill Workflow
input mapping
tool_progress_delta
skill_progress_delta
Tool / Skill Timeline 展示

项目从：

模型返回工具名，服务端执行函数

演进为：

模型返回 tool_call
↓
Tool Router 校验和路由
↓
Tool 按 workflow 执行 Skill
↓
Skill 产出结果
↓
Tool 汇总结果
↓
结果回填给 Agent Runtime

11. 总结
    Agent 调工具不是魔法。
    它不是模型想调什么就调什么。
    真正的工程链路应该是：

Tool Schema 定义能力契约
Tool Router 控制调用边界
Workflow 编排 Skill
Skill 执行具体能力
AgentEvent 暴露执行过程

拆清楚之后，Agent 架构就更容易理解，也更容易维护。
下一篇继续记录：
如何把 Agent Run、Tool Call、Skill Run 和 AgentEvent 落库，做一个可以复盘的 Run 详情页。
