codex

## 第 3 篇：我第一次把真实大模型接进 Agent，才发现不只是调一个接口

前面几天，我已经把 Agent 的基础链路跑起来了。

从页面输入一段内容，到服务端创建 conversation、message、run，再通过 SSE 把 Agent 执行过程实时推回前端，这条链路基本已经成型。

同时，我也把 Agent 的每一步都落进了 MySQL。

一次 Run 里发生了什么，什么时候开始，什么时候调用模型，什么时候调用工具，Skill 执行了什么，最终结果是什么，都可以在数据库里查到。

到这一步，看起来已经有点像一个真正的 Agent 项目了。

但其实还有一个很关键的问题：

前面跑通的，大部分还是 Mock。

也就是说，流程是真的，架构是真的，事件是真的，数据库也是真的。

但 Agent 的“大脑”还不是真的。

所以接下来，我开始把真实大模型接进来。

一开始我以为这件事很简单。

不就是调一个大模型接口吗？

准备好 API Key，把用户输入传过去，拿到返回结果，再展示到页面上。

但真正开始做的时候，我才发现，Agent 项目里的模型调用，和普通聊天接口并不是一回事。

普通聊天接口，大概是这样：

```txt
用户输入
↓
请求模型
↓
返回答案
```

而我现在要做的 Agent 链路，更像是这样：

```txt
用户输入
↓
模型判断是否需要调用工具
↓
服务端校验工具和参数
↓
执行 Tool
↓
Tool 内部编排 Skill
↓
Skill 可能继续调用模型
↓
Tool Result 回填给模型
↓
模型生成最终答案
```

它不是一次请求，而是一条执行链。

所以第一件事，不是直接把火山方舟的请求写进业务代码里，而是先做了一个 Model Adapter。

原因很简单：

我现在接的是豆包 Seed 2.0 Lite，但以后可能会换成 DeepSeek、通义千问、智谱，甚至同一个模型也可能通过不同平台接入。

如果我在 Agent Runtime 里直接写死某个平台的 HTTP 请求，后面一换模型，整个业务逻辑都会被污染。

所以我把模型分成两层理解：

```txt
模型平台：火山方舟、阿里百炼、腾讯混元、OpenAI 等
具体模型：豆包 Seed、DeepSeek、通义千问、智谱 GLM 等
```

项目里对应的配置就变成了：

```txt
MODEL_PROVIDER=volcengine_ark
MODEL_NAME=doubao-seed-2-0-lite-260428
MODEL_API_KEY=xxx
MODEL_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

这样 Agent Runtime 只关心一件事：

```txt
我要调用一个模型适配器
```

至于这个适配器后面是豆包，还是别的模型，那是配置和 Adapter 的事情。

接着，我开始处理 tool call。

这一步让我对 Agent 的理解又往前走了一点。

以前我理解的大模型，是“生成答案”。

但在 Agent 里，大模型还要参与“决策”。

比如用户输入一段岗位 JD 后，模型需要先判断：

这是不是一个适合调用工具的任务？

如果是，它应该返回类似这样的信息：

```txt
我要调用 analyzeJobAndGeneratePlan 这个工具
参数是 jdText 和 candidateProfile
```

服务端收到之后，不能直接信任模型。

因为模型可能返回不存在的工具名，也可能返回不符合 schema 的参数。

所以服务端要做三件事：

```txt
检查 toolName 是否在白名单
校验 arguments 是否符合 Tool Schema
把请求路由到对应 Tool Handler
```

这就是 Tool Router 的作用。

然后 Tool 内部继续执行 Skill。

目前我做了两个 Skill：

```txt
extractJobRequirementsSkill
generateSevenDayPlanSkill
```

前一个负责拆岗位要求，后一个负责生成准备计划。

一开始这两个 Skill 是固定逻辑，后来我把它们改成了 model 模式。

也就是说，Skill 自己内部也会调用模型，让模型生成结构化 JSON。

这样整个链路就变成了：

```txt
模型决定调用 Tool
↓
Tool 编排 Skill
↓
Skill 调模型生成结构化结果
↓
Tool 汇总结果
↓
模型基于 Tool Result 生成最终答案
```

这一步跑通之后，项目终于不再只是一个 Mock Agent。

它开始真的有点像一个轻量版智能体运行时了。

当然，问题也随之出现。

第一个问题是，怎么判断模型有没有真的返回 tool call。

一开始我只看最终回答，感觉模型好像工作了，但并不知道它中间有没有走工具。

后来我在 Timeline 里加了更明确的事件：

```txt
model_call_start
model_tool_call_decision
tool_call_start
skill_start
skill_result
tool_call_result
final_answer_delta
```

这样我就能看到模型到底有没有做工具规划。

第二个问题是 JSON 输出不稳定。

Skill 要求模型返回 JSON，但模型偶尔会包一层 Markdown，或者加一些解释。

所以我做了简单解析兜底：优先解析 JSON code block，如果没有，就从文本里提取第一个 JSON 对象。

这不是最终形态，但对于 MVP 来说够用了。

第三个问题是流式事件太多。

真实模型是一个 token 一个 token 往外吐，如果每个 token 都落成一个 AgentEvent，一次 Run 可能产生几千条事件。

数据库能存，但人没法看。

后来我做了事件合并，不再逐 token 落库，而是按长度或句子边界聚合。

这样 Run 详情页才重新变得可读。

这一阶段做下来，我最大的感受是：

接入大模型不是把 prompt 发过去就结束。

在一个 Agent 项目里，模型只是执行链的一部分。

它要参与决策，要调用工具，要接收工具结果，还要生成最终答案。

真正麻烦的地方不在于“怎么请求模型”，而在于：

```txt
模型什么时候该说话
什么时候该调用工具
服务端怎么约束它
工具结果怎么回填
过程怎么展示
失败怎么排查
```

以前我做前端，更多关注的是接口返回什么，页面怎么展示。

这一次，我开始真正意识到：

AI 应用里的前端和服务端，不只是围着一个接口转。

它们要一起承接一个不断推进的任务过程。

这也是我想复刻公司 Agent 架构的原因。

不是为了做一个聊天框，而是为了理解：

一个 Agent 是怎么被执行、约束、观察和复盘的。
