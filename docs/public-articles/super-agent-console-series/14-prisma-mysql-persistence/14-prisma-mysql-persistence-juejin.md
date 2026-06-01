掘金版
标题
Nuxt3 AI Agent 控制台实战 13：用 Prisma + MySQL 持久化 Agent Run 执行链路
正文
前面已经完成了：

双接口结构
AgentEvent 协议
SSE Timeline
Tool / Skill Process
Run 详情页

一开始，所有 Run 数据都存在内存里。
服务端维护一个 run-store：

创建 Run 时写入 Map
SSE 推送时追加 AgentEvent
Tool / Skill 过程也写入内存
Run 详情页根据 runId 查询内存

这种方式很适合 MVP 初期。
但它不适合长期使用。

1. 内存 run-store 的问题
   内存存储有明显限制：

服务重启，数据丢失
浏览器刷新后可能找不到旧记录
多实例部署时，每个实例内存不共享
不能长期复盘
不能做 replay
不能统计模型和工具效果

对 Agent 项目来说，这些问题会越来越明显。
因为 Agent 的核心价值不只是生成答案，还包括：

执行过程可观察
异常过程可排查
历史 Run 可复盘
工具调用效果可分析

所以数据库持久化是必须要补的一步。

2. Prisma 数据模型
   当前使用 Prisma 定义 MVP 数据模型。
   主要包含：

Conversation
Message
AgentRun
AgentEvent
ToolCall
SkillRun
IdempotencyRecord

它们分别对应当前 Agent MVP 中的核心对象。
Conversation
表示一段会话。

conversationId
createdAt
updatedAt

一段 conversation 下可以有多条 message 和多个 run。

Message
表示用户输入或后续消息。

messageId
conversationId
role
content
createdAt

当前 MVP 主要记录用户输入。

AgentRun
表示一次 Agent 执行。

runId
conversationId
messageId
traceId
status
input
finalAnswer
error
startedAt
finishedAt
createdAt
updatedAt

这是整个系统的核心对象。

AgentEvent
表示执行过程中的事件。

eventId
runId
traceId
eventType
sequence
status
name
message
data
createdAt

用于支撑：

Timeline
Run 详情页
Redis Replay
日志追踪

ToolCall
表示一次工具调用。

toolCallId
runId
toolName
arguments
result
status
startedAt
finishedAt

SkillRun
表示一次 Skill 执行。

skillRunId
runId
toolCallId
skillName
input
output
status
startedAt
finishedAt

IdempotencyRecord
表示幂等记录。

userId
clientRequestId
conversationId
messageId
runId
createdAt

服务端通过：

userId + clientRequestId

保证重复请求不会重复创建 message / run。

3. 数据库选型
   数据库选型绕了一圈。
   最初考虑使用 TencentDB。
   托管 MySQL 的好处是：

维护成本低
备份和高可用能力更完整
生产更稳定

但香港地域价格对个人练习项目偏高，而且至少双节点起步。
所以最终线上先采用：

K3S 自建 MySQL

成本更低，也适合当前个人 Demo 阶段。

4. 本地开发数据库
   本地开发时，又遇到一个问题：
   直接连 K3S 里的 MySQL 太麻烦。
   需要先在服务器上执行：

kubectl port-forward

再在本地执行：

ssh -L

还会受到 VPN、香港网络、可视化客户端连接稳定性的影响。
这不适合作为日常开发链路。
所以最后确定：

本地开发：本机 Docker MySQL
线上运行：K3S MySQL
表结构同步：Prisma migration

这样本地开发环境更稳定。
线上环境继续贴近部署实践。

5. Prisma migration
   表结构通过 Prisma migration 管理。
   本地开发使用：

prisma migrate dev

这里踩了一个点：
migrate dev 会创建 shadow database，用来对比迁移状态。
如果应用账号没有创建数据库的权限，会报错。
所以本地开发环境里，直接用 root 账号跑 migration。
但线上不应该这么做。
线上使用：

prisma migrate deploy

它只应用已经生成好的 migration 文件，不需要像 migrate dev 那样创建 shadow database。
真正需要提交进 Git 的是：

prisma/schema.prisma
prisma/migrations/\*

而不是本地数据库本身。

6. run-persistence 服务
   新增持久化服务：

server/services/run-persistence.ts

它负责把 Agent Run 过程写入数据库。
创建 Run 时
写入：

Conversation
Message
AgentRun
IdempotencyRecord

SSE 推送事件时
每一条事件写入：

AgentEvent

Tool 事件
遇到：

tool_call_start

创建或更新 ToolCall。
遇到：

tool_call_result

更新 ToolCall 的：

result
status
finishedAt

Skill 事件
遇到：

skill_start

创建或更新 SkillRun。
遇到：

skill_result

更新 SkillRun 的：

output
status
finishedAt

Run 完成时
更新 AgentRun：

finalAnswer
status = completed
finishedAt

失败时更新：

status = failed
error
finishedAt

7. 为什么继续保留内存 run-store？
   当前没有直接删除内存 run-store。
   而是采用双写：

内存 run-store
保证当前页面和 SSE 演示稳定

Prisma persistence
负责持久化和后续复盘

这样即使数据库短暂失败，也不会影响当前 mock SSE 链路。
数据库失败时：

记录 warn 日志
fallback 到内存

这对 MVP 阶段更友好。
后续等 NSQ、Redis、任务状态存储完善后，再逐步替换内存 run-store。

8. Run 详情页改造
   Run 详情页的数据源改成：

优先查询数据库
查不到或失败时 fallback 到内存

请求流程：

GET /api/agent/runs/:runId
↓
查询 MySQL
↓
如果存在，返回数据库记录
↓
如果不存在，查询内存 run-store
↓
返回 fallback 数据

这样 mock Agent 执行完成后，可以：

在 Sequel Ace 中看到完整记录
在 Run 详情页中复盘执行过程
通过 runId / traceId 串联日志和数据

9. 当前主链路
   到这里，Agent MVP 的主链路变成：

POST /api/conversations/messages
创建 conversation / message / run
↓
GET /api/agent/runs/:runId/events
SSE 推送 AgentEvent
↓
前端 Timeline 展示
↓
Tool / Skill Process 展示
↓
Prisma 写入数据库
↓
/runs/:runId 详情页复盘

也就是说，项目已经从：

只在内存中演示一次 Agent Run

升级为：

可以把一次 Agent Run 持久化下来，并事后复盘

10. 本阶段踩到的关键点
    这一阶段最大的感受是：
    数据库接入本身不难。
    真正影响开发效率的是环境边界。
    需要想清楚：

本地怎么连？
线上怎么连？
开发库和生产库怎么分？
migration 用什么账号跑？
应用账号是否需要建库权限？
K3S 里的数据库是否暴露？
本地可视化工具怎么连？

这些问题不是业务代码。
但它们决定项目能不能顺畅开发和稳定部署。

11. 总结
    数据库持久化让 Agent Run 不再只是临时内存状态。
    它让下面这些能力成为可能：

Run 详情页
历史复盘
Tool / Skill 效果分析
错误定位
Redis Replay
Coze Loop Trace 上报
模型效果统计

对 Agent 项目来说，数据落库不是锦上添花。
它是后续持续迭代的基础。
因为：

不能复盘的 Agent，很难真正优化。

当前阶段完成后，Agent MVP 的主链路已经基本闭环。
下一步，就是把 mock model 换成真实 LLM，让这个 Agent 从模拟执行进入真实模型调用阶段。
