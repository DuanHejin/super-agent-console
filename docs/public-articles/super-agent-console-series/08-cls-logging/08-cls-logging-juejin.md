掘金版
标题
Nuxt3 AI Agent 控制台实战 07：接入腾讯云 CLS，采集 K3S 容器 stdout 日志
正文
前面几篇已经完成了项目的基础部署链路：

Code
→ GitHub Actions
→ Docker Build
→ GHCR
→ K3S Deployment
→ Pod
→ Service
→ Ingress
→ Browser

同时，配置和密钥也已经通过：

ConfigMap
Secret
GitHub Secrets

分开管理。
到这一步，项目已经可以通过域名访问。
但线上服务还有一个关键问题：
出问题时怎么查？
本地开发时，可以直接看终端和浏览器控制台。
但部署到 K3S 后，应用跑在 Pod 里，Pod 跑在云服务器上。
浏览器里看到一个 500，背后可能是：

应用异常
Pod 启动失败
Service 转发错误
Ingress 配置问题
静态资源缺失
环境变量未注入
第三方接口失败

因此，这一篇开始接入腾讯云 CLS，用于采集线上日志。

1. 目标
   当前阶段目标很明确：

采集 K3S 中 Nuxt 应用的 stdout 日志
将日志上报到腾讯云 CLS
能在 CLS 控制台检索线上日志
用于后续线上排障

不做复杂可观测性平台。
不做完整指标体系。
先把日志采集主链路跑通。

2. 为什么采集 stdout？
   容器化应用推荐将日志输出到：

stdout
stderr

而不是一开始就写入应用内部文件。
原因是：

容器重启后文件可能丢失
日志文件需要挂载和轮转
路径管理复杂
采集规则更容易分散

当前项目选择：

Nuxt 应用输出日志到 stdout
K3S / containerd 负责落地容器日志
LogListener 采集节点日志文件
CLS 存储和检索日志

整体链路：

应用 stdout
→ K3S 节点日志文件
→ LogListener
→ CLS 日志主题
→ 控制台检索

3. 创建 CLS 资源
   在腾讯云后台创建基础资源：

日志集
日志主题
机器组
采集规则

可以简单理解为：

日志集：日志资源容器
日志主题：具体存储某类日志
机器组：哪些服务器要被采集
采集规则：采哪些文件、怎么解析、送到哪里

真正配置时，核心就是回答四个问题：

哪台机器？
采哪个路径？
用什么格式解析？
送到哪个日志主题？

4. 安装 LogListener
   当前 K3S 部署在一台香港轻量应用服务器上。
   所以需要在这台服务器上安装腾讯云 LogListener。
   LogListener 的作用是：

读取服务器上的日志文件
按照采集规则解析
上报到腾讯云 CLS

安装时需要配置腾讯云访问凭证。
这里建议使用子账号，而不是主账号。
原因：

主账号权限过大
子账号可以最小权限授权
降低密钥泄露风险

配置完成后，腾讯云 CLS 后台可以识别到这台机器。
说明：

Server
→ LogListener
→ CLS

这条通道已经建立。

5. stdout 日志路径
   配置采集规则时，需要填写采集路径。
   一开始可能会疑惑：
   要采集 stdout，为什么还要配置文件路径？
   原因是：
   在 K3S / containerd 中，容器 stdout 最终会落到节点上的日志文件。
   常见路径包括：

/var/log/pods/...
/var/log/containers/...

kubectl logs 能看到的内容，本质上也是从这些容器日志文件读取出来的。
当前使用的是服务器 LogListener + 机器组方式。
所以不是直接接 Kubernetes 采集组件，而是从宿主机文件系统采集日志。
因此需要配置采集路径。
当前链路可以理解为：

Nuxt stdout
→ containerd 日志文件
→ LogListener 文件采集
→ CLS

6. 提取模式选择单行全文
   当前项目日志来源不完全统一：

pino JSON 日志
Nuxt / Nitro 框架日志
普通字符串日志
错误堆栈
containerd 包装后的 stdout/stderr 日志

如果一开始直接使用 JSON 提取，可能会因为部分日志不是标准 JSON 而解析失败。
所以第一阶段选择：

单行全文

优点：

兼容性强
不容易丢日志
能先看到完整错误
适合先跑通链路

缺点是字段化能力弱。
后续可以再逐步优化：

统一 JSON 日志
补 traceId
补 runId
补 eventType
改为结构化提取

当前原则仍然是：
先采集成功，再逐步结构化。

7. 验证采集成功
   配置完成后，通过访问应用接口触发日志：

/api/health
/api/ready
/api/db-check

然后在 CLS 控制台按时间范围和关键词检索。
如果能看到应用日志，说明链路打通。
当前成功链路：

Nuxt 应用 stdout
→ K3S 节点日志文件
→ LogListener
→ CLS 日志主题
→ 控制台检索

到这里，项目已经具备基础线上日志查看能力。

8. 一次真实排障：/\_nuxt/\*.js 500
   日志接入后，很快遇到了一个真实问题。
   现象：

页面 HTML 可以返回
但浏览器请求 /\_nuxt/\*.js 返回 500

CLS 里看到错误：

/\_nuxt/\*.js 500
ENOENT: no such file or directory

日志里给出的查找路径类似：

/app/.output/server/chunks/public/\_nuxt/xxx.js

但实际构建产物在：

/app/.output/public/\_nuxt

也就是说：

Nitro 运行时查找路径
和 Docker 镜像中的静态资源位置
不一致

最终修复方式：

修改 Dockerfile
将 .output/public 同步到 Nitro 运行时查找路径
重新构建镜像
通过 GitHub Actions 发布

修复后，/\_nuxt/\*.js 的 500 消失。
这次问题说明日志采集非常有价值。
没有 CLS 时，只能从浏览器现象猜问题。
有 CLS 后，可以直接看到服务端错误路径和堆栈。

9. 后续日志规范方向
   当前日志已经能采集，但还不够规范。
   后续计划统一关键日志字段：

level
time
service
env
traceId
runId
eventType
message

尤其是 Agent 执行链路。
一次 Agent Run 可能包含：

前端提交
创建 runId
调用模型
工具调用
SSE 推送
数据库落库
Timeline 展示

如果没有 runId 和 traceId，后续排查会很困难。
所以后续日志需要支持：

按 traceId 查一次请求
按 runId 查一次 Agent 执行
按 eventType 查某类事件
按 level 查错误日志

当前 CLS 接入只是第一步。
它先解决“日志能看到”的问题。
后续再解决“日志更好查”的问题。

10. 当前阶段结果
    这一阶段完成了：

腾讯云 CLS 日志集创建完成
日志主题创建完成
机器组创建完成
K3S 云服务器安装 LogListener
LogListener 使用子账号 SecretId / SecretKey 初始化成功
腾讯云后台识别到服务器
采集规则配置完成
K3S 容器 stdout 日志成功进入 CLS
提取模式先使用单行全文
可以在 CLS 控制台检索线上日志
通过 CLS 发现并修复 /\_nuxt/\*.js 500 问题

线上排障链路从：

浏览器看到异常
→ 猜问题

变成：

浏览器看到异常
→ 查 CLS 日志
→ 定位错误路径
→ 修复 Dockerfile
→ CI/CD 发布
→ 再观察日志

11. 排查经验
    11.1 日志采集尽早做
    不要等项目复杂后再补日志。
    哪怕是个人项目，线上日志也能明显降低排障成本。
    11.2 单行全文适合第一阶段
    日志格式不统一时，先用单行全文。
    保证日志不丢，比一开始追求结构化更重要。
    11.3 理解 stdout 的落地路径
    在 K3S / containerd 中，stdout 最终会变成节点上的日志文件。
    LogListener 采集的是这些文件。
    11.4 日志里不要输出敏感信息
    不要打印：

API Key
数据库密码
token
SSH 私钥

11.5 后续补 traceId 和 runId
Agent 项目里，后续应补：

traceId：追踪一次请求
runId：追踪一次 Agent 执行

12. 总结
    这一篇完成了腾讯云 CLS 日志接入。
    最终链路：

Nuxt stdout
→ K3S / containerd 日志文件
→ LogListener
→ CLS
→ 控制台检索

这一步之后，项目不只是能通过域名访问。
它开始具备基础线上排障能力。
从域名、服务器、K3S、Docker、GHCR、GitHub Actions，到 ConfigMap、Secret、CLS 日志，这一套下来，项目已经有了比较完整的交付底座。
下一步可以进入真正的 AI Agent 开发层：
先从 SSE 流式输出和 Agent Timeline 开始，把一次 Agent 执行过程展示出来。
