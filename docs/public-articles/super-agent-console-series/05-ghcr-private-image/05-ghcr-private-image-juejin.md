掘金版
标题
Nuxt3 AI Agent 控制台实战 04：推送镜像到 GHCR，并让 K3S 拉取私有镜像
正文
上一篇完成了 Nuxt3 项目的 Docker 化。
项目从：

Nuxt3 源码

变成了：

Docker Image

但此时镜像只存在本机，云服务器上的 K3S 还无法直接使用它。
要让 K3S 能运行这个应用，需要把镜像推送到远程镜像仓库。
这一篇记录：

本地 Docker 镜像
→ GitHub Container Registry
→ K3S 拉取私有镜像
→ Deployment 替换 image
→ 通过域名访问 Nuxt 首页

1. 为什么需要镜像仓库？
   Docker 镜像本地构建完成后，只能在本机使用。
   但 K3S 运行在云服务器上。
   如果要让 K3S 创建 Pod，就需要能从远程镜像仓库拉取镜像。
   完整链路是：

docker build
↓
docker push
↓
K3S pull image
↓
Pod start

镜像仓库的作用就是：
存放应用镜像，让服务器或 K8s 集群可以拉取并运行。

2. 为什么选择 GHCR？
   可选镜像仓库有很多，比如：

Docker Hub
腾讯云 TCR
阿里云 ACR
GitHub Container Registry

这个项目最后选择 GitHub Container Registry，也就是 GHCR。
原因是：

代码仓库在 GitHub
后续 CI/CD 使用 GitHub Actions
Actions 构建完成后可以直接 push 到 GHCR
链路简单
权限管理集中
适合个人项目

当前部署方案已经从 TKE 调整成自建 K3S，所以没有继续强依赖腾讯云 TCR。
最终链路设计为：

GitHub Repo
→ GitHub Actions
→ Docker Build
→ GHCR
→ K3S Pull Image

3. 镜像命名和 tag 管理
   最开始可以手动构建一个镜像：

super-agent-console:0.1.0

同时打一个：

latest

推送到 GHCR 后，镜像类似：

ghcr.io/xxx/super-agent-console:0.1.0
ghcr.io/xxx/super-agent-console:latest

这里不建议只依赖 latest。
因为 latest 虽然方便，但排查问题时不清晰。
更推荐每次发布都有明确版本号。
比如：

0.1.8
0.1.9
0.2.0

这样可以明确知道线上 Deployment 当前运行的是哪个版本。

4. 自动递增版本号脚本
   为了避免每次手动想版本号，可以写一个简单的 build-and-push 脚本。
   脚本逻辑：

查询 GHCR 已有 tag
解析 semver 版本
找到最大版本号
自动递增 patch
构建 linux/amd64 镜像
推送新版本 tag
同时推送 latest

版本规则示例：

0.1.8 -> 0.1.9
0.1.99 -> 0.2.0

这不是完整发布系统，但对 MVP 项目已经够用。
它解决了两个问题：

每次发布都有明确版本
减少手动 tag 错误

5. 登录并推送 GHCR
   推送 GHCR 需要 GitHub token。
   至少需要权限：

write:packages
read:packages

用途：

write:packages：推送镜像
read:packages：读取镜像

这里要注意：
不要把 token 写死在脚本或代码里。
更合适的做法是通过环境变量传入。
推送流程大致是：

docker login ghcr.io
docker build
docker tag
docker push

推送完成后，镜像会出现在 GitHub Packages / GHCR 中。

6. K3S 拉取 GHCR 私有镜像
   如果 GHCR package 是私有的，K3S 默认无法直接拉取。
   Deployment 里配置：

ghcr.io/xxx/super-agent-console:0.1.0

但没有认证信息时，Pod 可能会进入：

ImagePullBackOff

这类问题常见原因包括：

镜像地址错误
tag 不存在
网络无法访问镜像仓库
私有镜像没有认证权限

如果是私有镜像权限问题，需要创建 imagePullSecret。
这个 Secret 用于保存镜像仓库认证信息。
然后在 Deployment 中配置：

imagePullSecrets

这样 K3S 创建 Pod 时，就会使用该 Secret 去 GHCR 拉取镜像。

7. 替换 Deployment image
   前面 K3S 中跑的是 Nginx Demo。
   原 image：

nginx

现在需要替换成：

ghcr.io/xxx/super-agent-console:0.1.0

可以通过：

kubectl set image

或者修改 Deployment YAML 后重新 apply。
例如流程可以理解为：

更新 Deployment image
↓
Deployment 触发 rollout
↓
K3S 拉取 GHCR 镜像
↓
创建新的 Pod
↓
旧 Pod 被替换

8. 注意端口变化
   这里有一个很容易漏掉的点：端口。
   Nginx 默认监听：

80

Nuxt Nitro server 默认监听：

3000

所以从 Nginx 镜像切换到 Nuxt 镜像时，需要检查：

Deployment containerPort
Service targetPort
Ingress 指向的 Service port

如果端口配置不一致，可能出现：

Pod Running
Service 正常
但浏览器访问失败

这时不要只看 Pod 状态，还要检查 Service 是否把流量转发到了容器真实监听端口。

9. 部署完成后的访问链路
   完成镜像替换和端口调整后，再次访问域名。
   链路变成：

Browser
→ Domain
→ K3S Ingress
→ Service
→ Nuxt Pod
→ Nuxt 首页

当页面从 Nginx 默认页变成 Nuxt 首页时，说明部署链路已经打通。
这一步验证了：

镜像已推送到 GHCR
K3S 可以拉取私有镜像
imagePullSecret 配置正确
Deployment 成功更新
Service 端口配置正确
Ingress 访问正常
Nuxt 应用正常启动

10. 当前阶段结果
    这一阶段完成了：

选择 GHCR 作为镜像仓库
本地镜像推送到 GHCR
镜像支持版本 tag 和 latest tag
编写 build-and-push 脚本
版本号支持自动递增
K3S 配置 GHCR imagePullSecret
Deployment 从 Nginx 镜像切换为 Nuxt 镜像
调整 containerPort / targetPort
通过域名访问 Nuxt 首页

部署链路升级为：

Local Code
→ Docker Build
→ GHCR
→ K3S Pull Image
→ Deployment Rollout
→ Pod
→ Service
→ Ingress
→ Browser

11. 排查经验
    这一阶段容易遇到的问题主要有几个。
    11.1 ImagePullBackOff
    如果 Pod 状态是：

ImagePullBackOff

优先检查：

镜像地址是否正确
tag 是否存在
GHCR package 是否私有
imagePullSecret 是否创建
Deployment 是否引用 imagePullSecret

11.2 端口不一致
从 Nginx 切换到 Nuxt 时，注意：

Nginx：80
Nuxt：3000

需要同步调整：

containerPort
targetPort
Service port

11.3 不要只依赖 latest
latest 不利于回滚和排查。
建议保留：

明确版本 tag
latest tag

11.4 token 不要写死
GitHub token 应通过环境变量或 Secret 管理，不要写入脚本和代码仓库。

12. 总结
    这一篇完成了从本地镜像到远程镜像仓库的打通。
    最终结果是：

本地镜像
→ GHCR
→ K3S 拉取
→ Pod 运行
→ 域名访问

这一步是后续自动化部署的基础。
因为只有镜像进入远程仓库，GitHub Actions 才能在构建后把镜像推到固定位置，K3S 也才能从固定位置拉取新版本。
下一篇继续记录：
如何使用 GitHub Actions，在代码合并到 release 分支后自动构建镜像、推送 GHCR，并远程更新 K3S Deployment。
