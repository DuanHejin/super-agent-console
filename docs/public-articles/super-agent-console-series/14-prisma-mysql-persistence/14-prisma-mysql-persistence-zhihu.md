知乎版
标题
我把 Agent 的每一步都落进了数据库
正文
一开始，所有 Run 都存在内存里。
这样做很快，也适合 MVP 初期。
前端创建 Run，服务端把数据放进 Map，SSE 推送过程中继续往这个 Map 里追加事件。
页面能跑。
Timeline 能展示。
Run 详情页也能看。
但这个方案的问题也很明显：

服务一重启，数据就没了
浏览器刷新后可能找不到旧记录
以后多实例部署时，每个实例的内存都不一样
无法长期复盘
无法做 replay
无法统计模型和工具效果

所以，接数据库是迟早要做的。
尤其对 Agent 项目来说，如果数据只存在内存里，那它更像是一个演示页面。
它能看到现场，但很难沉淀历史。
而我想做的不是一个只能现场看的 Demo。
我想让每一次 Agent 执行，都能被事后复盘。

先定义 MVP 数据模型
我先用 Prisma 定义了一套 MVP 数据模型。
主要有这些表：

Conversation
Message
AgentRun
AgentEvent
ToolCall
SkillRun
IdempotencyRecord

它们分别对应：

Conversation：一段会话
Message：用户输入或后续消息
AgentRun：一次 Agent 执行
AgentEvent：执行过程里的每一个事件
ToolCall：一次工具调用
SkillRun：一次 Skill 执行
IdempotencyRecord：前端 clientRequestId 幂等记录

这个结构不是为了追求完整。
而是为了覆盖当前 MVP 里已经真实存在的对象。
我不想一开始就设计一堆未来可能用到的表。
比如复杂评测、模型调用记录、Prompt 版本、Workflow 版本、成本统计，这些以后都可以加。
但第一阶段，我只需要让当前链路落得下去。
也就是：

一次会话
一条消息
一次 Agent Run
一组事件
一次工具调用
几个 Skill 执行
一条幂等记录

先把这些核心对象存下来，就够了。

数据库选型也绕了一圈
数据库选型这一步，我也绕了一圈。
一开始我想用 TencentDB。
托管数据库当然更省心，备份、高可用、监控这些都不用自己管。
但看了价格之后，发现香港地域的托管 MySQL 对个人练习项目有点贵。
同样配置，香港比内地贵不少，而且至少双节点起步。
对公司项目来说，这很正常。
但对我这个个人练习项目来说，有点超出当前阶段的成本预期。
后来我决定先用 K3S 自建 MySQL。
这样线上可以跑起来，成本也低。
但真正本地开发时，又发现另一个问题：
本地连 K3S 里的 MySQL 太麻烦。
要先在服务器终端里执行：

kubectl port-forward

再在本地执行：

ssh -L

还会受到 VPN、香港网络、可视化客户端连接稳定性的影响。
这条链路适合临时排查，不适合每天开发。
所以最后策略改成：

本地开发：本机 Docker MySQL
线上运行：K3S MySQL
表结构同步：Prisma migration

这个调整很关键。
因为开发环境应该尽量稳定、快速、少依赖外部网络。
如果每次本地开发都要先连远程 K3S 里的数据库，整个开发节奏会很难受。

migration 也有自己的边界
接着我用 Prisma migration 在本地生成表结构。
这里也踩了一个小坑。
prisma migrate dev 会创建 shadow database，用来对比迁移状态。
如果应用账号没有创建数据库的权限，就会报错。
本地开发环境里，我最后直接用 root 账号跑 migration。
这没什么问题。
因为本地库本来就是开发用，方便优先。
但线上不应该这样。
线上更适合执行：

prisma migrate deploy

它只应用已经生成好的 migration 文件，不像 migrate dev 那样需要创建 shadow database。
也就是说，真正需要提交进 Git 的不是本地数据库，而是：

prisma/schema.prisma
prisma/migrations/\*

这样本地和线上都能基于同一套 migration 保持表结构一致。

给 Agent Run 加持久化服务
表建好之后，我新增了一层持久化服务：

server/services/run-persistence.ts

它负责把 mock Agent Run 写进数据库。
创建 Run 时写：

Conversation
Message
AgentRun
IdempotencyRecord

SSE 推送每一条事件时写：

AgentEvent

如果遇到：

tool_call_start

就创建或更新 ToolCall。
如果遇到：

tool_call_result

就更新 ToolCall 的结果和完成状态。
如果遇到：

skill_start

就创建或更新 SkillRun。
如果遇到：

skill_result

就更新 SkillRun 的结果和完成状态。
Run 完成时，再把最终答案和完成时间写回 AgentRun。
这样一来，一次 Agent 执行就不只是页面上的临时过程了。
它会沉淀成数据库里的结构化记录。

为什么没有立刻删掉内存 run-store
这里我没有立刻删掉内存 run-store。
原因很简单：
我不想让数据库问题影响 SSE 演示链路。
所以现在是双写：

内存 run-store：保证当前页面和 SSE 演示稳定
Prisma persistence：负责持久化和后续复盘

如果数据库短暂失败，系统会记录 warn 日志，然后 fallback 到内存。
这样开发阶段会更舒服。
因为当前阶段我的目标不是做一个完美的数据层，而是把 Agent MVP 主链路跑通。
等后面引入 NSQ、Redis 或更完整的运行时存储，再逐步替换内存 run-store。
这个过程也让我意识到：
很多系统不是一步到位的。
先用内存跑通，再双写数据库，再逐步切换主读源，是一个更稳的演进方式。

Run 详情页优先读数据库
最后，我把 Run 详情页改成优先读数据库。
逻辑是：

先查 MySQL
查到就返回数据库里的 Run 详情
查不到或失败，再 fallback 到内存

这样 mock Agent 执行完之后，我能在 Sequel Ace 里看到完整记录。
也能在页面里通过 Run 详情复盘。
到这里，Agent MVP 的一条主链路基本完整了：

创建 Run
→ SSE 推送
→ Timeline 展示
→ Tool / Skill 过程展示
→ 数据库落库
→ Run 详情复盘

还差最后一步，就是把 mock model 换成真实 LLM。

接数据库不难，难的是环境边界
这一阶段给我的感受是：
接数据库本身不难。
真正麻烦的是环境边界。
比如：

本地怎么连？
线上怎么连？
开发库和生产库怎么分？
migration 用什么账号跑？
应用账号要不要有建库权限？
K3S 里的数据库要不要暴露？
本地可视化工具怎么连？

这些问题都不属于业务代码。
但它们都会影响开发效率。
以前我可能会觉得这些事情很烦。
现在我反而觉得，它们就是从“写 Demo”走向“做项目”必须补上的部分。
因为一个项目只要涉及真实部署，就不可能只关心业务代码。
数据库、账号、权限、migration、环境隔离，这些都属于工程的一部分。

Agent 不能复盘，就很难迭代
对 Agent 项目来说，数据库落库的意义不只是保存记录。
更重要的是，它让执行过程可以被复盘。
如果一次 Agent Run 出了问题，我可以回头看：

用户输入是什么
Run 状态是什么
模型分析过程是什么
Tool 参数是什么
Skill 输入是什么
Skill 输出是什么
最终答案是什么
错误发生在哪一步

这些信息如果只存在内存里，就很脆弱。
服务一重启，痕迹就没了。
但落到数据库里之后，它就变成了可以长期观察、分析和优化的基础。
这也是我现在越来越明确的一点：
不能复盘的 Agent，很难真正迭代。
下一篇，我会继续记录：
如何把 mock model 换成真实 LLM，让这个 Agent MVP 从模拟执行走向真实模型调用。
