掘金版

标题
Nuxt3 AI Agent 控制台实战 14：接入真实大模型与 Tool Calling 执行链路
正文
前面已经完成了 Agent MVP 的基础链路：
POST /api/conversations/messages
创建 conversation / message / run

GET /api/agent/runs/:runId/events
通过 SSE 推送 AgentEvent

/runs/:runId
复盘一次 Run 的完整执行过程
同时也完成了：
AgentEvent 协议
SSE Timeline
Tool / Skill Process
Run 详情页
Prisma + MySQL 持久化
到这一步，一次 Agent Run 已经可以被创建、推送、展示、落库和复盘。
但前面大部分执行过程还是 Mock。
也就是说：
Agent 执行链路是真的
SSE 事件是真的
数据库落库是真的
Run 详情页也是真的
但模型决策还不是真的
所以这一阶段开始接入真实大模型。
当前接入的是火山方舟上的豆包 Seed 2.0 Lite。
接入之后才发现，Agent 里的模型调用，不是普通 chat 接口那么简单。
普通聊天接口是：
user input
→ LLM
→ answer
Agent 的调用链路更像是：
user input
→ LLM 判断是否需要 tool call
→ 服务端校验 toolName / arguments
→ Tool Router 路由到 Tool
→ Tool 内部执行 Skill Workflow
→ Skill 可能继续调用模型
→ Tool Result 回填给 LLM
→ LLM 生成最终答案
这不是一次模型请求。
而是一条执行链。

1. Model Adapter
   接入真实模型时，没有把火山方舟的请求直接写进 Agent Runtime。
   原因是模型接入需要可替换。
   现在用的是豆包，后面可能切到：
   DeepSeek
   通义千问
   智谱 GLM
   OpenAI
   平台也可能从火山方舟切到：
   阿里百炼
   腾讯混元
   OpenAI API
   第三方模型网关
   所以先抽了一层 Model Adapter。
   配置大概是：
   MODEL_PROVIDER=volcengine_ark
   MODEL_NAME=doubao-seed-2-0-lite-260428
   MODEL_API_KEY=xxx
   MODEL_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
   Agent Runtime 不直接关心具体模型供应商。
   它只调用统一的模型适配器。
   这样后面切模型时，主要调整的是配置和 Adapter，而不是改 Runtime 主流程。
   这一层解决的是：
   模型平台和 Agent Runtime 解耦
2. Tool Call 执行边界
   接入真实模型后，下一步是处理 tool call。
   当前测试场景是：
   用户输入一段岗位 JD
   ↓
   Agent 分析岗位要求
   ↓
   生成 7 天准备计划
   模型需要判断这个任务是否需要调用工具。
   如果需要，它应该返回类似：
   toolName: analyzeJobAndGeneratePlan
   arguments:
   jdText
   candidateProfile
   但服务端不能直接信任模型返回。
   所以 Tool Router 需要做三件事：
   检查 toolName 是否在白名单
   校验 arguments 是否符合 Tool Schema
   路由到对应 Tool Handler
   这里的重点是：
   LLM 负责提出调用意图
   服务端负责执行边界控制
   模型不能直接执行真实业务能力。
   它只能提出“我想调用什么”。
   真正是否允许调用、参数是否合法、调用哪个 handler，必须由服务端决定。
3. Tool 内部 Skill Workflow
   Tool 不应该写成一个大函数。
   当前把 analyzeJobAndGeneratePlan 拆成了两个 Skill：
   extractJobRequirementsSkill
   generateSevenDayPlanSkill
   第一个 Skill 负责提取岗位要求：
   必备技能
   加分项
   岗位职责
   风险点
   第二个 Skill 负责生成 7 天准备计划：
   第 1 天
   第 2 天
   第 3 天
   ...
   第 7 天
   一开始 Skill 是固定 mock 逻辑。
   接入真实模型后，把 Skill 改成 model 模式。
   也就是 Skill 内部也会调用模型，让模型输出结构化 JSON。
   最终链路变成：
   LLM 返回 tool call
   → Tool Router 校验并路由
   → Tool 执行 Skill Workflow
   → Skill 调用模型生成结构化结果
   → Tool 汇总 Tool Result
   → Tool Result 回填给 LLM
   → LLM 输出最终答案
   这一步跑通后，项目才真正从 Mock Agent 进入真实 Agent Runtime 阶段。
4. AgentEvent 增强
   只看最终答案不够。
   因为页面上有答案，不代表模型真的走了 tool call。
   所以在 AgentEvent 里补了更明确的事件：
   model_call_start
   model_tool_call_decision
   tool_call_start
   skill_start
   skill_result
   tool_call_result
   final_answer_delta
   这样前端 Timeline 和 Run 详情页可以看到：
   模型是否触发 tool call
   触发了哪个 Tool
   Tool 参数是什么
   Skill 是否开始
   Skill 输出了什么
   Tool Result 是否回填
   最终答案如何生成
   这一步很关键。
   Agent 系统不是只看最终答案。
   它必须能看中间过程。
   否则模型到底有没有调用工具、工具有没有执行、Skill 有没有失败，都只能靠猜。
5. 结构化 JSON 解析
   Skill 需要模型返回 JSON。
   理想输出是：
   {
   "requiredSkills": ["Vue", "Node.js", "SSE"],
   "bonusSkills": ["Agent", "RAG"]
   }
   但真实模型有时会返回：
   下面是分析结果：

````json
{
  "requiredSkills": ["Vue", "Node.js", "SSE"],
  "bonusSkills": ["Agent", "RAG"]
}

或者在 JSON 前后加解释。

所以不能直接 `JSON.parse`。

当前做了一个简单兜底：

```txt
优先解析 JSON code block
没有 code block 时，尝试提取第一个 JSON 对象
仍然失败，则记录 agent_error / skill_error
这不是最终生产级方案。
但对于 MVP 阶段，可以先保证链路跑通。
这里也说明一点：
让模型输出结构化数据
不是写一句“请返回 JSON”就结束
服务端必须考虑解析、兜底、错误记录和复盘。
6. 流式事件聚合
真实模型是 token 级流式输出。
如果每个 token 都落一个 AgentEvent，一次 Run 可能产生几千条事件。
问题不是数据库不能存。
而是人没法看。
Run 详情页会被大量碎片事件淹没。
所以这里做了事件合并。
大概策略是：
实时推送：保持较细粒度，保证前端流式体验
数据库落库：按长度或句子边界聚合
Run 详情页：展示聚合后的可读事件
这一步明确区分了两类诉求：
前端实时体验需要流式
事后排查复盘需要可读
两者不能完全用同一种事件粒度。
7. 当前结果
这一阶段完成后，项目已经支持：
真实豆包模型接入
Model Adapter 抽象
LLM tool call 决策
Tool Router 白名单和参数校验
Tool 内部 Skill Workflow
Skill model 模式
Tool Result 回填模型
AgentEvent Timeline 展示
结构化 JSON 解析兜底
流式事件聚合落库
Run 详情页复盘真实模型执行过程
到这里，Agent 不再只是 Mock 流程。
它开始真正变成一条由模型参与的执行链。
8. 当前主链路
当前主链路可以整理为：
POST /api/conversations/messages
创建 conversation / message / run
↓
GET /api/agent/runs/:runId/events
建立 SSE 连接
↓
Agent Runtime 调用 Model Adapter
↓
LLM 判断是否需要 tool call
↓
Tool Router 校验 toolName / arguments
↓
Tool Handler 执行 Skill Workflow
↓
Skill model 调用生成结构化结果
↓
Tool Result 回填 LLM
↓
LLM 生成最终答案
↓
AgentEvent 推送前端 Timeline
↓
Prisma + MySQL 持久化
↓
/runs/:runId 详情页复盘
也就是说，项目已经从：
模拟一次 Agent Run
变成：
用真实模型参与一次 Agent Run
9. 本阶段踩到的关键点
这一阶段主要踩到三个点。
第一个是：
不能只看最终答案
最终答案出现，不代表 tool call 被触发。
需要通过 AgentEvent 明确记录模型决策过程。
第二个是：
不能完全相信模型 JSON
即使 prompt 要求返回 JSON，模型也可能返回 Markdown 包裹或解释文本。
服务端需要解析兜底和错误记录。
第三个是：
不能把所有 token 都当作复盘事件
实时流式体验和事后 Run 详情页是两种不同诉求。
前端需要细粒度。
数据库和详情页需要可读性。
所以需要事件聚合。
10. 总结
这一步最大的感受是：
接入真实大模型不是把 prompt 发过去就结束。
在 Agent 项目里，模型只是执行链的一部分。
真正难的是：
模型什么时候应该输出文本
什么时候应该调用工具
tool call 怎么校验
Tool Result 怎么回填
Skill 怎么编排
结构化输出怎么解析
中间事件怎么展示
失败问题怎么复盘
普通 AI Chat 页面，核心是“问答”。
但 Agent Console 的核心是“执行过程”。
它不是只返回一个答案，而是要让一次任务从开始到结束都可观察、可约束、可复盘。
当前阶段完成后，Agent MVP 已经从 Mock 执行进入真实模型调用阶段。
下一步，就需要继续处理真实模型接入后的稳定性问题。
比如：
模型请求超时
跨地域网络抖动
模型 fallback
错误事件
Run 失败态
重试和取消
这些才是真实模型进入系统后，继续暴露出来的工程问题。
````
