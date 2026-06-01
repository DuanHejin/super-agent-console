codex

# 第四篇：Agent 调工具不是魔法，我把 Tool 和 Skill 拆开实现了一遍

做 Agent 绕不开工具调用。

但一开始我对 tool call 的理解比较粗糙。

模型返回一个工具名和参数，服务端找到对应函数执行，然后把结果返回给模型。

大概就是这样。

但真正开始写代码时，我发现这里面至少有三层东西不能混在一起：

```txt
Tool Schema
Tool Router
Skill Workflow
```

如果都写成一个函数，短期能跑，后面会很难维护。

---

我先定义了 Tool Schema。

比如第一个 Tool 叫：

```txt
analyzeJobAndGeneratePlan
```

它的作用是分析岗位 JD，并生成一个 7 天面试准备计划。

它的参数大概是：

```txt
jdText
candidateProfile
```

这个 Tool Schema 有几个作用。

第一，它告诉模型这个工具能做什么。

第二，它告诉服务端参数应该是什么结构。

第三，它给后续配置后台留了边界。

也就是说，Tool 不是随便暴露一个函数给模型，而是一个有契约的能力。

---

然后是 Tool Router。

模型返回 tool call 后，服务端不能直接执行。

它必须先做几件事：

```txt
检查 toolName 是否在白名单
检查 Tool 是否启用
校验 arguments 是否符合 schema
找到对应 Tool handler
执行 Tool
```

这一步很重要。

因为模型返回的内容不能完全信任。

它可能返回一个不存在的工具名，也可能返回参数缺字段，甚至参数类型不对。

所以 Tool Router 是模型和真实业务能力之间的一道安全边界。

这个边界以后会越来越重要。

---

再往里一层，就是 Skill。

我这次没有把 Tool 直接写成一个大函数。

而是让 Tool 内部编排多个 Skill。

比如：

```txt
Tool: analyzeJobAndGeneratePlan
  → Skill 1: extractJobRequirementsSkill
  → Skill 2: generateSevenDayPlanSkill
```

第一个 Skill 负责从 JD 里提取信息：

```txt
必备技能
加分项
岗位职责
风险点
```

第二个 Skill 负责根据提取结果生成计划：

```txt
第 1 天做什么
第 2 天做什么
后续怎么准备
```

这样拆完之后，Tool 更像一个业务能力，Skill 更像内部步骤。

后面如果要扩展，也可以继续加 Skill，而不是把所有逻辑堆在一个函数里。

---

这里我做了一个提前设计：

Tool、Skill、Workflow 都用 TS 配置文件维护。

比如：

```txt
server/agent-config/tools.ts
server/agent-config/skills.ts
server/agent-config/workflows.ts
server/agent-config/models.ts
```

为什么要这么做？

因为我后面希望这个项目能演进成一个轻量配置后台。

现在用 TS 写配置，未来后台可以用类似结构存 JSON。

也就是说，当前代码配置就是未来配置后台的数据结构雏形。

这一步不是为了过度设计，而是为了不把执行逻辑写死在 runtime 里。

Agent Runtime 应该负责推动流程，不应该知道每个 Tool 里面到底有几个 Skill。

---

为了让 workflow 能串起来，我还写了一个简单的 input mapping。

例如第二个 Skill 的输入，可以来自第一个 Skill 的输出：

```txt
$steps.extract-requirements.output
```

Tool 参数也可以映射给 Skill：

```txt
$toolArgs.jdText
```

这样 workflow 就不是硬编码的：

```txt
手动把 A 的结果传给 B
```

而是由配置描述数据流向。

MVP 阶段这个能力很轻量，但已经够用了。

---

这一阶段还有一个细节让我印象比较深。

一开始我只展示 Skill 的输入和输出。

但后来发现，真实执行过程中，Skill 可能也有中间态。

比如它不是瞬间完成，而是在一步步处理。

所以我加了：

```txt
tool_progress_delta
skill_progress_delta
```

让 Tool 和 Skill 的过程也能被前端看到。

这样前端 Timeline 里就不只是：

```txt
Skill 开始
Skill 结束
```

而是能看到：

```txt
Skill 开始
正在读取输入
正在匹配关键词
正在整理结果
Skill 结束
```

这更接近真实 Agent 的执行感。

---

这个阶段做完后，我对 tool call 的理解更清楚了。

模型只负责决定“要不要调用工具，以及用什么参数”。

但工具能不能执行、参数是否合法、执行流程怎么编排、结果怎么返回，都是服务端要负责的。

换句话说：

```txt
LLM 负责决策
Tool Router 负责边界
Workflow 负责编排
Skill 负责具体能力
```

这几个角色拆清楚之后，Agent 架构就没那么神秘了。

它不是魔法，而是一套事件驱动的工程流程。
