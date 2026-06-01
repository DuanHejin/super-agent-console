知乎版
标题
前端也要认真理解配置和密钥：我为什么暂时放弃 Nacos，先用 ConfigMap 和 Secret
正文
前面几步做完后，我的项目已经有了一条比较完整的部署链路。
代码合并到 release 分支之后，GitHub Actions 会自动构建 Docker 镜像，推送到 GHCR，然后通过 SSH 登录服务器，更新 K3S 里的 Deployment。
到这一步，我已经可以通过域名访问自己的 Nuxt3 项目了。
但项目继续往前走，很快就遇到另一个问题：
配置应该放在哪里？
比如：

模型服务地址
模型 ID
数据库连接地址
API Key
日志级别
功能开关

这些东西不可能都写死在代码里。
尤其是 API Key、数据库密码、服务端 token 这类敏感信息。
如果硬编码到项目里，一旦代码 push 到远程仓库，后面会非常麻烦。
所以这一阶段，我开始处理生产环境配置和敏感信息管理。

一开始我想接 Nacos
我在公司项目里接触过 Nacos。
它可以作为配置中心，管理不同环境、不同 group 下的配置。
所以一开始我也想：
既然这次项目要练云原生，要不要顺手把 Nacos 也接进来？
这样项目启动时，就可以从 Nacos 拉取配置。
后续模型配置、服务地址、敏感信息，也可以放到配置中心里统一管理。
这个思路本身没问题。
如果是公司生产环境，Nacos 当然很常见。
但当我真正准备接的时候，发现它对当前阶段来说有点重。
我要先部署 Nacos。
还要考虑：

Nacos 怎么持久化
怎么开启鉴权
怎么暴露管理后台
本地开发怎么访问
公网访问是否安全
配置拉取失败如何兜底
启动 Nacos 的凭证又放在哪里

这些问题都不是不能解决。
但它们会把当前项目复杂度一下子拉高。
而我现在的主线不是搭一个完整配置中心。
我的主线是继续推进：

AI Agent 控制台
服务端接口
SSE 流式响应
数据库落库
日志采集和排障

所以最后我决定：
先不接 Nacos。
先用更朴素的方式，把配置和密钥管理跑通。
也就是：

本地开发：.env.local
K3S 生产普通配置：ConfigMap
K3S 生产敏感配置：Secret
CI/CD 密钥：GitHub Secrets

这个方案没有 Nacos 那么完整。
但它更符合当前阶段。

.env.example 只是变量清单
在项目里，我保留了 .env.example。
它不是用来放真实配置的。
它的作用是告诉自己和后续维护者：
这个项目需要哪些环境变量。
比如：

APP_NAME
APP_VERSION
LOG_LEVEL
ARK_BASE_URL
ARK_MODEL_ID
MOCK_MODEL_ENABLED
DATABASE_URL
ARK_API_KEY

这里面既有普通配置，也有敏感配置。
但 .env.example 只能放示例值。
真实值不应该提交到 Git。
本地开发时，可以复制一份：

.env.local

然后在里面填写真实的本地配置。
这一步对前端并不陌生。
很多前端项目都会用 .env 文件。
但这次我更明确地区分了几类配置：

浏览器可以看到的配置
服务端可以看到的普通配置
服务端才能看到的敏感配置
CI/CD 流水线使用的密钥

这个区分很重要。

浏览器可见配置：一定不是秘密
Nuxt3 里，如果某些配置需要在浏览器端使用，应该放到 runtimeConfig.public 里。
对应环境变量一般是：

NUXT*PUBLIC*\*

比如：

NUXT_PUBLIC_APP_NAME
NUXT_PUBLIC_APP_VERSION
NUXT_PUBLIC_SITE_URL
NUXT_PUBLIC_DEPLOY_ENV

这些值会暴露给浏览器。
所以它们只能放非敏感信息。
不能把 API Key、数据库地址、token 放进去。
这是前端很容易犯错的地方。
前端代码最终会进入浏览器。
只要进入浏览器，就可以被用户通过 DevTools 看到。
所以规则很简单：
浏览器需要用的，只能是非敏感配置。 真正敏感的信息，永远留在服务端。
如果浏览器端某个功能必须依赖敏感信息，那就应该做一层服务端中转。
浏览器请求自己的 server API。
服务端再使用密钥调用真正的第三方服务。
这样密钥不会出现在浏览器里。

ConfigMap 放普通配置
生产环境里，普通配置我放到 K3S ConfigMap。
比如：

APP_NAME
APP_VERSION
LOG_LEVEL
ARK_BASE_URL
ARK_MODEL_ID
MOCK_MODEL_ENABLED
NUXT_PUBLIC_APP_NAME
NUXT_PUBLIC_APP_VERSION
NUXT_PUBLIC_SITE_URL

这些配置即使被看到，也不会直接造成严重安全问题。
ConfigMap 创建好后，可以通过 Deployment 注入到容器环境变量里。
应用启动后，仍然通过环境变量读取。
也就是说，对应用代码来说，它不用关心这些变量到底来自哪里。
本地开发时，来自 .env.local。
线上运行时，来自 K3S ConfigMap。
代码读的都是同一组 key。
这点很重要。
如果本地一套变量名，线上另一套变量名，后面一定会乱。

Secret 放敏感配置
敏感配置则放到 K3S Secret。
比如：

DATABASE_URL
ARK_API_KEY
DEMO_SERVER_TOKEN

这些东西不能放进 ConfigMap，更不能写进代码。
Secret 最终也可以注入到容器环境变量里。
所以应用代码仍然可以这样读：

process.env.ARK_API_KEY
process.env.DATABASE_URL

它不需要知道这个变量来自 Secret。
不过这里也要注意一点：
Kubernetes Secret 默认并不是一个强加密保险箱。
它只是 Kubernetes 里专门用来管理敏感信息的资源。
真正要安全，还需要控制集群权限，也不要把真实 Secret YAML 提交到代码仓库。
所以我在项目里只保留了：

secret.example.yaml

里面放的是示例值。
真实 Secret 在服务器上通过命令创建。
这样可以避免真实密钥进入 Git 历史。

GitHub Secrets 放 CI/CD 密钥
还有一类密钥，不属于应用运行时配置。
它们是给 GitHub Actions 用的。
比如：

GHCR_TOKEN
K3S_SSH_HOST
K3S_SSH_USER
K3S_SSH_PRIVATE_KEY

这些只在 CI/CD 流程里使用。
它们的作用是：

推送镜像到 GHCR
登录服务器
执行 kubectl 更新 Deployment

所以它们应该放到 GitHub Actions Secrets 里。
这类密钥其实更敏感。
因为它们可能涉及镜像仓库写权限、服务器登录权限。
一个 SSH 私钥如果泄露，风险会非常大。
到这里，我对配置的分工就比较清楚了：

.env.local
本地开发使用，不提交

.env.example
变量清单，只放示例值

K3S ConfigMap
生产普通配置

K3S Secret
生产敏感配置

GitHub Secrets
CI/CD 使用的密钥

这个方案不复杂，但足够清晰。

做一个配置验证 Demo
为了确认配置真的生效，我在项目里做了一个小 Demo。
浏览器首页会打印一些非敏感的 public runtime config。
比如：

应用名
版本号
部署环境
站点地址

同时服务端提供一个接口，用来返回敏感配置是否已加载。
但只返回布尔值。
比如：

databaseUrlLoaded: true
arkApiKeyLoaded: true
demoServerTokenLoaded: true

不会把真实值返回给浏览器。
这样我就可以验证两件事：
第一，浏览器确实能拿到非敏感配置。
第二，服务端确实加载到了 Secret。
但敏感值没有泄露到浏览器。
这一步很小，但我觉得很有必要。
因为配置问题最怕的是：
我以为它生效了。
真正部署到 K3S 后，我也在 Pod 里检查了环境变量，确认 ConfigMap 和 Secret 都已经注入成功。

这次为什么暂缓 Nacos？
现在回头看，暂缓 Nacos 是一个合理选择。
Nacos 更适合后续项目复杂起来之后再接。
当前阶段，如果为了配置中心花大量时间处理部署、鉴权、持久化和公网访问，反而会打断主线。
ConfigMap 和 Secret 虽然朴素，但已经能解决当前最重要的问题：

配置不硬编码
敏感信息不进代码
本地和线上使用同一组 key
生产环境通过 K3S 注入配置
CI/CD 密钥独立管理

这就够了。
不是每一步都要上最完整的方案。
有时候，先用简单方案跑通，并且把边界划清楚，反而更适合个人练习项目。

当前阶段完成了什么？
这一阶段完成后，我得到的结果是：

暂缓接入 Nacos
保留 .env.example 作为变量清单
本地开发使用 .env.local
K3S 创建 ConfigMap 保存普通配置
K3S 创建 Secret 保存敏感配置
Deployment 通过 envFrom 注入 ConfigMap 和 Secret
Nuxt runtimeConfig.public 暴露浏览器可读配置
服务端接口验证 Secret 已加载，但不返回真实值
GitHub Actions Secrets 管理 CI/CD 密钥

也就是说，项目的配置管理开始有了基本边界。
它还不是复杂配置中心。
但已经不再是把配置随手写进代码里。

前端为什么也要理解这些？
以前做前端时，我对配置的理解更多停留在：

不同环境使用不同接口地址

但这次我开始更认真地区分：

什么可以给浏览器看
什么只能留在服务端
什么属于应用运行时配置
什么属于 CI/CD 部署权限

这些理解，对后面做 AI 产品也很重要。
因为 AI 项目里会有很多敏感信息：

模型 API Key
数据库连接
第三方服务 token
内部接口地址

如果一开始边界不清楚，后面很容易出安全问题。

给前端和初学者的一点建议
如果你也在做类似项目，我现在会建议：
第一，不要急着上配置中心。
Nacos、Apollo 这类工具很好，但个人项目一开始可以先用 .env.local + ConfigMap + Secret。
第二，.env.example 只做变量清单。
不要放真实值，也不要把本地 .env.local 提交到仓库。
第三，浏览器能看到的一定不是秘密。
只要是 NUXT*PUBLIC*\* 或 runtimeConfig.public，都要默认它会暴露给用户。
第四，敏感逻辑放到服务端。
如果浏览器功能需要用密钥，就通过 server API 中转，不要把密钥发到前端。
第五，Secret 示例文件只放假值。
真实 Secret 在服务器上创建，不要进入 Git 历史。

最后
这是我重新部署自己的第六步。
我没有急着把 Nacos 接进来。
而是先用 K3S ConfigMap 和 Secret，把配置和密钥的边界理清楚。
它不是最复杂的方案，但对当前阶段刚好够用。
下一篇，我会继续记录：
如何接入腾讯云 CLS，把线上日志采集起来，让问题不再只靠猜。
