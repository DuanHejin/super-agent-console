codex

# 第六篇：我把 Agent 的每一步都落进了数据库

一开始，所有 Run 都存在内存里。

这样做很快，也适合 MVP 初期。

前端创建 Run，服务端把数据放进 Map，SSE 推送过程中继续往这个 Map 里追加事件。

页面能跑。
Timeline 能展示。
Run 详情页也能看。

但问题很明显：

```txt
服务一重启，数据就没了
浏览器刷新后可能找不到旧记录
以后多实例部署时，每个实例的内存都不一样
无法长期复盘
无法做 replay
无法统计模型和工具效果
```

所以接数据库是迟早要做的。

---

我先用 Prisma 定义了一套 MVP 数据模型。

主要有这些表：

```txt
Conversation
Message
AgentRun
AgentEvent
ToolCall
SkillRun
IdempotencyRecord
```

它们分别对应：

```txt
Conversation：一段会话
Message：用户输入或后续消息
AgentRun：一次 Agent 执行
AgentEvent：执行过程里的每一个事件
ToolCall：一次工具调用
SkillRun：一次 Skill 执行
IdempotencyRecord：前端 clientRequestId 幂等记录
```

这个结构不是为了追求完整，而是为了覆盖当前 MVP 里已经真实存在的对象。

我不想一开始就设计一堆未来可能用到的表。

先让当前链路落得下去。

---

数据库选型这一步也绕了一圈。

一开始我想用 TencentDB。

但看了价格之后，发现香港地域的托管 MySQL 对个人练习项目有点贵。

同样配置，香港比内地贵不少，而且至少双节点起步。

后来我决定先用 K3S 自建 MySQL。

这样线上可以跑起来，成本也低。

再后来，真正本地开发时又发现一个问题：

本地连 K3S 里的 MySQL 太麻烦。

要先在服务器 OrcaTerm 里执行：

```txt
kubectl port-forward
```

再在本地执行：

```txt
ssh -L
```

还会受到 VPN、香港网络、可视化客户端连接稳定性的影响。

这条链路适合临时排查，不适合每天开发。

所以最后策略改成：

```txt
本地开发：本机 Docker MySQL
线上运行：K3S MySQL
表结构同步：Prisma migration
```

这个调整很关键。

因为开发环境应该尽量稳定、快速、少依赖外部网络。

---

接着我用 Prisma migration 在本地生成表结构。

这里也踩了一个小坑。

`prisma migrate dev` 会创建 shadow database，用来对比迁移状态。

如果应用账号没有创建数据库的权限，就会报错。

本地开发环境里，我最后直接用 root 账号跑 migration。

这没什么问题，因为本地库本来就是开发用。

但线上不应该这样。

线上更适合执行：

```txt
prisma migrate deploy
```

它只应用已经生成好的 migration 文件，不需要像 `migrate dev` 那样创建 shadow database。

也就是说，真正需要提交进 Git 的不是本地数据库，而是：

```txt
prisma/schema.prisma
prisma/migrations/*
```

---

表建好之后，我新增了一层持久化服务：

```txt
server/services/run-persistence.ts
```

它负责把 mock Agent Run 写进数据库。

创建 Run 时写：

```txt
Conversation
Message
AgentRun
IdempotencyRecord
```

SSE 推送每一条事件时写：

```txt
AgentEvent
```

如果遇到：

```txt
tool_call_start
```

就创建或更新 ToolCall。

如果遇到：

```txt
tool_call_result
```

就更新 ToolCall 的结果和完成状态。

如果遇到：

```txt
skill_start
```

就创建或更新 SkillRun。

如果遇到：

```txt
skill_result
```

就更新 SkillRun 的结果和完成状态。

Run 完成时，再把最终答案和完成时间写回 AgentRun。

---

这里我没有立刻删掉内存 run-store。

原因是我不想让数据库问题影响 SSE 演示链路。

所以现在是双写：

```txt
内存 run-store：保证当前页面和 SSE 演示稳定
Prisma persistence：负责持久化和后续复盘
```

如果数据库短暂失败，系统会记录 warn 日志，然后 fallback 到内存。

这样开发阶段会更舒服。

等后面引入 NSQ、Redis 或更完整的运行时存储，再逐步替换内存 run-store。

---

最后我把 Run 详情页改成优先读数据库。

逻辑是：

```txt
先查 MySQL
查到就返回数据库里的 Run 详情
查不到或失败，再 fallback 到内存
```

这样 mock Agent 执行完之后，我能在 Sequel Ace 里看到完整记录。

也能在页面里通过 Run 详情复盘。

到这里，Agent MVP 的一条主链路基本完整了：

```txt
创建 Run
→ SSE 推送
→ Timeline 展示
→ Tool / Skill 过程展示
→ 数据库落库
→ Run 详情复盘
```

还差最后一步，就是把 mock model 换成真实 LLM。

---

这一阶段给我的感受是：

接数据库本身不难。

真正麻烦的是环境边界。

本地怎么连？
线上怎么连？
开发库和生产库怎么分？
migration 用什么账号跑？
应用账号要不要有建库权限？
K3S 里的数据库要不要暴露？
本地可视化工具怎么连？

这些问题都不属于业务代码，但都会影响开发效率。

以前我可能会觉得这些事情很烦。

现在我反而觉得，它们就是从“写 Demo”走向“做项目”必须补上的部分。

因为只要数据不能落下来，Agent 就没法复盘。

而不能复盘的 Agent，很难真正迭代。
