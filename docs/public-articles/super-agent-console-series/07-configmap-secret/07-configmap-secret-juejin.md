掘金版
标题
Nuxt3 AI Agent 控制台实战 06：使用 K3S ConfigMap 和 Secret 管理配置与密钥
正文
前面几篇已经完成了部署链路：

Code
→ GitHub Actions
→ Docker Build
→ GHCR
→ K3S Deployment
→ Pod
→ Service
→ Ingress
→ Browser

代码合并到 release 分支后，GitHub Actions 会自动构建镜像，推送到 GHCR，并通过 SSH 更新 K3S 中的 Deployment。
到这一步，Nuxt3 应用已经可以通过域名访问。
接下来需要解决的是配置管理问题。
项目后续会涉及：

模型服务地址
模型 ID
数据库连接地址
API Key
日志级别
功能开关

这些配置不能硬编码到代码里。
尤其是 API Key、数据库密码、SSH 私钥这类敏感信息，不能进入 Git 仓库。
这一篇记录当前阶段的配置管理方案：

本地开发：.env.local
变量清单：.env.example
生产普通配置：K3S ConfigMap
生产敏感配置：K3S Secret
CI/CD 密钥：GitHub Actions Secrets

1. 为什么暂时不接 Nacos？
   一开始考虑过接入 Nacos。
   如果项目复杂度较高，Nacos 可以作为配置中心，用于管理不同环境、不同 group 下的配置。
   但在当前 MVP 阶段，直接接 Nacos 会引入额外复杂度：

Nacos 部署
数据持久化
鉴权
管理后台暴露
本地开发访问
公网访问安全
配置拉取失败兜底
Nacos 启动凭证管理

当前项目主线是：

AI Agent 控制台
Nuxt server API
SSE 流式响应
Agent Timeline
数据库落库
日志采集和排障

所以暂时不引入 Nacos。
先使用 Kubernetes 原生的 ConfigMap 和 Secret 管理配置。
这个方案更轻量，也足够支撑当前阶段。

2. 配置分层
   当前项目配置分为五类：

.env.local
本地开发真实配置，不提交 Git

.env.example
环境变量清单，只放示例值

K3S ConfigMap
生产环境普通配置

K3S Secret
生产环境敏感配置

GitHub Secrets
CI/CD 流水线使用的密钥

这个分层的核心是：
应用代码读取同一组环境变量，但不同环境的变量来源不同。
本地来自 .env.local。
线上来自 ConfigMap 和 Secret。
CI/CD 密钥来自 GitHub Actions Secrets。

3. .env.example：变量清单
   .env.example 只用于说明项目需要哪些变量。
   例如：

APP_NAME=super-agent-console
APP_VERSION=0.1.0
LOG_LEVEL=info
ARK_BASE_URL=https://example.com
ARK_MODEL_ID=your_model_id
MOCK_MODEL_ENABLED=true

DATABASE_URL=mysql://user:password@host:3306/db
ARK_API_KEY=your_api_key
DEMO_SERVER_TOKEN=your_demo_server_token

NUXT_PUBLIC_APP_NAME=Super Agent Console
NUXT_PUBLIC_APP_VERSION=0.1.0
NUXT_PUBLIC_SITE_URL=https://example.com
NUXT_PUBLIC_DEPLOY_ENV=production

注意：

.env.example 可以提交
.env.local 不能提交
.env.example 不能写真实值

4. Nuxt3 runtimeConfig.public
   Nuxt3 中，如果变量需要暴露给浏览器端，应该放在 runtimeConfig.public 中。
   通常对应：

NUXT*PUBLIC*\*

比如：

NUXT_PUBLIC_APP_NAME
NUXT_PUBLIC_APP_VERSION
NUXT_PUBLIC_SITE_URL
NUXT_PUBLIC_DEPLOY_ENV

这些变量会进入浏览器环境。
因此它们只能是非敏感配置。
不能放：

API Key
DATABASE_URL
token
内部服务地址
第三方服务密钥

规则很简单：
只要前端能看到，就不是秘密。
如果前端功能需要调用第三方服务，并且需要 API Key，应该通过 Nuxt server API 中转。
浏览器请求自己的后端接口，后端再使用服务端密钥调用第三方服务。

5. K3S ConfigMap：普通配置
   生产环境普通配置放到 ConfigMap。
   例如：

APP_NAME
APP_VERSION
LOG_LEVEL
ARK_BASE_URL
ARK_MODEL_ID
MOCK_MODEL_ENABLED
NUXT_PUBLIC_APP_NAME
NUXT_PUBLIC_APP_VERSION
NUXT_PUBLIC_SITE_URL
NUXT_PUBLIC_DEPLOY_ENV

这些变量即使被看到，也不会直接造成严重安全风险。
Deployment 中可以通过 envFrom 注入 ConfigMap。
应用启动后，仍然通过环境变量读取配置。
这样本地和线上可以保持同一套 key。

6. K3S Secret：敏感配置
   敏感配置放到 Secret。
   例如：

DATABASE_URL
ARK_API_KEY
DEMO_SERVER_TOKEN

Secret 同样可以通过 envFrom 注入到 Deployment。
应用代码读取方式仍然是：

process.env.DATABASE_URL
process.env.ARK_API_KEY

需要注意：
Kubernetes Secret 不是万能保险箱。
不要把真实 secret.yaml 提交到仓库。
建议仓库中只保留：

secret.example.yaml

真实 Secret 在服务器上创建。
这样可以避免密钥进入 Git 历史。

7. GitHub Actions Secrets：CI/CD 密钥
   CI/CD 流水线使用的密钥放到 GitHub Actions Secrets。
   例如：

GHCR_TOKEN
K3S_SSH_HOST
K3S_SSH_USER
K3S_SSH_PORT
K3S_SSH_PRIVATE_KEY

这些变量不属于应用运行时配置。
它们只用于：

登录 GHCR
推送镜像
SSH 登录服务器
执行 kubectl set image

因此不应该放入 ConfigMap 或 K3S Secret。
更不能写入代码仓库。

8. Deployment 注入配置
   线上运行时，Deployment 通过 envFrom 同时注入 ConfigMap 和 Secret。
   逻辑上可以理解为：

ConfigMap → 普通环境变量
Secret → 敏感环境变量
Container → process.env

这样 Nuxt 应用不需要关心变量来源。
它只需要读取环境变量即可。
这对本地和生产环境保持一致很重要。

9. 配置验证 Demo
   为了验证配置是否生效，我做了一个小 Demo。
   9.1 浏览器展示 public runtime config
   首页展示非敏感配置：

应用名
版本号
部署环境
站点地址

这些来自：

runtimeConfig.public

9.2 服务端验证 Secret 是否加载
服务端提供接口，返回敏感配置是否已加载。
但只返回布尔值：

{
"databaseUrlLoaded": true,
"arkApiKeyLoaded": true,
"demoServerTokenLoaded": true
}

不会返回真实值。
这样可以确认：

ConfigMap 已注入
Secret 已注入
public 配置能给浏览器使用
敏感配置只留在服务端

10. 当前阶段结果
    这一阶段完成了：

暂缓接入 Nacos
使用 .env.example 维护变量清单
本地开发使用 .env.local
K3S ConfigMap 保存普通配置
K3S Secret 保存敏感配置
Deployment 通过 envFrom 注入 ConfigMap 和 Secret
Nuxt runtimeConfig.public 暴露浏览器可读配置
服务端接口验证 Secret 已加载但不返回真实值
GitHub Actions Secrets 管理 CI/CD 密钥

配置管理链路变成：

本地开发：
.env.local → Nuxt process.env / runtimeConfig

生产运行：
ConfigMap + Secret → Pod env → Nuxt process.env / runtimeConfig

CI/CD：
GitHub Secrets → GitHub Actions workflow

11. 排查经验
    11.1 浏览器配置和服务端配置要分清
    NUXT*PUBLIC*\* 会暴露到浏览器。
    不能放敏感信息。
    11.2 Secret 不要提交到仓库
    仓库里只放 secret.example.yaml。
    真实 Secret 在服务器上创建。
    11.3 配置名要统一
    本地和线上尽量使用同一组 key。
    否则很容易出现：

本地能跑
线上读不到配置

11.4 验证时不要返回真实值
服务端可以返回：

xxxLoaded: true

不要返回真实 API Key 或连接字符串。
11.5 不要急着上配置中心
个人 MVP 阶段，ConfigMap + Secret 通常已经够用。
Nacos / Apollo 可以后续再接。

12. 总结
    这一篇完成了项目的基础配置管理。
    最终分工：

.env.example：变量清单
.env.local：本地真实配置
ConfigMap：生产普通配置
Secret：生产敏感配置
GitHub Secrets：CI/CD 密钥

这一步之后，项目不再依赖硬编码配置。
敏感信息也开始有了明确边界。
对 AI Agent 项目来说，这很重要。
因为后续会涉及：

模型 API Key
数据库连接
内部服务地址
第三方 token

这些都不能暴露到浏览器，也不能写进仓库。
下一篇继续记录：
如何接入腾讯云 CLS，把线上日志采集起来，让问题不再只靠猜。
