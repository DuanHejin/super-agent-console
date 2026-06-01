知乎版
标题
Agent 调工具不是魔法，我把 Tool 和 Skill 拆开实现了一遍
正文
做 Agent 绕不开工具调用。
一开始我对 tool call 的理解其实很粗糙。
模型返回一个工具名和参数，服务端找到对应函数执行，然后把结果返回给模型。
大概就是这样。
听起来好像不复杂。
但真正开始写代码之后，我发现这里面至少有三层东西不能混在一起：

Tool Schema
Tool Router
Skill Workflow

如果都写成一个函数，短期确实能跑。
但后面一旦工具变多、参数变复杂、执行过程变长，代码很快就会变得难维护。
所以这一阶段，我开始把 Tool 和 Skill 拆开实现。

Tool Schema：工具不是随便暴露的函数
我先定义了 Tool Schema。
第一个 Tool 叫：

analyzeJobAndGeneratePlan

它的作用是：

分析岗位 JD，并生成一个 7 天面试准备计划

它的参数大概是：

jdText
candidateProfile

一开始我以为 Tool Schema 只是给模型看的说明。
后来发现，它其实有三层作用。
第一，它告诉模型这个工具能做什么。
第二，它告诉服务端参数应该是什么结构。
第三，它给后续配置后台留了边界。
也就是说，Tool 不是随便暴露一个函数给模型。
它应该是一个有契约的能力。
模型看到的是这个契约，服务端执行时也要基于这个契约做校验。
这一步让我开始意识到：
工具调用不是模型想调什么就调什么，而是服务端提前注册好一批安全、可控、可校验的能力。

Tool Router：模型和真实业务能力之间的边界
有了 Tool Schema 之后，还需要 Tool Router。
模型返回 tool call 后，服务端不能直接执行。
它必须先做几件事：

检查 toolName 是否在白名单
检查 Tool 是否启用
校验 arguments 是否符合 schema
找到对应 Tool handler
执行 Tool

这一步很重要。
因为模型返回的内容不能完全信任。
它可能返回一个不存在的工具名。
也可能返回参数缺字段。
甚至参数类型不对。
如果服务端直接相信模型返回的内容，就相当于把业务能力完全暴露给了一个不稳定的生成系统。
所以 Tool Router 是模型和真实业务能力之间的一道安全边界。
我现在会把它理解成：
模型可以提出调用意图，但服务端决定是否允许执行，以及怎么执行。
这个边界以后会越来越重要。

Skill：Tool 里面不应该写成一个大函数
再往里一层，就是 Skill。
我这次没有把 Tool 直接写成一个大函数。
而是让 Tool 内部编排多个 Skill。
比如：

Tool: analyzeJobAndGeneratePlan
→ Skill 1: extractJobRequirementsSkill
→ Skill 2: generateSevenDayPlanSkill

第一个 Skill 负责从 JD 里提取信息：

必备技能
加分项
岗位职责
风险点

第二个 Skill 负责根据提取结果生成计划：

第 1 天做什么
第 2 天做什么
后续怎么准备

这样拆完之后，Tool 更像一个对外暴露的业务能力。
Skill 更像 Tool 内部的执行步骤。
后面如果要扩展，比如增加一个“候选人匹配度分析”，就可以再加一个 Skill，而不是把所有逻辑都堆进一个函数里。
这让我对公司项目里的 Tool / Skill 架构有了更具体的理解。
Tool 是模型可调用的能力入口。
Skill 是服务端内部可组合、可复用的能力单元。

用配置文件先模拟未来的配置后台
这一阶段我还做了一个提前设计。
Tool、Skill、Workflow 都先用 TS 配置文件维护。
比如：

server/agent-config/tools.ts
server/agent-config/skills.ts
server/agent-config/workflows.ts
server/agent-config/models.ts

为什么要这么做？
因为我后面希望这个项目能演进成一个轻量配置后台。
现在用 TS 写配置，未来后台可以用类似结构存 JSON。
也就是说，当前代码配置就是未来配置后台的数据结构雏形。
这一步不是为了过度设计。
而是为了避免把执行逻辑写死在 Agent Runtime 里。
Agent Runtime 应该负责推动流程。
它不应该关心每个 Tool 里面到底有几个 Skill，也不应该把某个 Tool 的业务步骤写死在主流程里。

Workflow：让 Tool 内部的 Skill 编排可描述
为了让 workflow 能串起来，我还写了一个简单的 input mapping。
例如第二个 Skill 的输入，可以来自第一个 Skill 的输出：

$steps.extract-requirements.output

Tool 参数也可以映射给 Skill：

$toolArgs.jdText

这样 workflow 就不是硬编码的：

手动把 A 的结果传给 B

而是由配置描述数据流向。
比如：

Tool 参数 jdText
→ 传给 extractJobRequirementsSkill

extractJobRequirementsSkill 的输出
→ 传给 generateSevenDayPlanSkill

MVP 阶段这个能力很轻量。
但它已经能说明一个问题：
Tool 内部的 Skill 编排，本质上就是一条小型工作流。
它和 Coze 工作流的思想有点像，只不过我这里不是可视化画布，而是先用代码配置实现一个轻量版。

Tool 和 Skill 也需要过程展示
这一阶段还有一个细节让我印象比较深。
一开始我只展示 Skill 的输入和输出。
但后来发现，真实执行过程中，Skill 可能也有中间态。
它不是瞬间完成的，而是在一步步处理。
比如：

正在读取 JD 文本
正在匹配技术关键词
正在整理岗位要求
正在生成 7 天计划

如果前端只展示：

Skill 开始
Skill 结束

过程还是不够清楚。
所以我加了两个事件：

tool_progress_delta
skill_progress_delta

让 Tool 和 Skill 的过程也能被前端看到。
这样 Timeline 里就不只是开始和结束，而是能看到执行过程。
这让 Agent Console 更像一个真实的执行面板，而不是一个普通日志列表。

我对 Tool Call 的理解变清楚了
这个阶段做完后，我对 tool call 的理解清楚了很多。
以前我以为：

模型返回工具名
服务端执行函数
返回结果

现在我会拆成：

模型返回 tool_call
服务端校验 toolName 和 arguments
Tool Router 找到对应 Tool
Tool 内部按 Workflow 执行多个 Skill
Skill 产出结果
Tool 汇总结果
服务端把结果回填给模型
模型继续生成最终答案

这中间每一层都有自己的职责。
可以总结成：

LLM 负责决策
Tool Router 负责边界
Workflow 负责编排
Skill 负责具体能力

这几个角色拆清楚之后，Agent 架构就没那么神秘了。
它不是魔法。
它是一套事件驱动的工程流程。

最后
这一步完成之后，我开始真正理解：
Agent 的核心不是“模型会调用工具”这句话本身，而是服务端如何安全、可控、可观察地执行这次工具调用。
模型只是提出调用意图。
真正让这件事变成一个可靠系统的，是：

Tool Schema
Tool Router
Skill Workflow
AgentEvent
Timeline
状态机
日志和复盘

下一篇，我会继续记录：
当 Tool 和 Skill 跑通之后，如何把执行过程落到数据库里，做一个可以事后查看的 Run 详情页。
