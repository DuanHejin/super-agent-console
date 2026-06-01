掘金版
标题
Nuxt3 AI Agent 控制台实战 05：用 GitHub Actions 自动构建镜像并部署到 K3S
正文
前面几篇已经完成了以下链路：

Nuxt3 源码
→ Docker Image
→ GHCR
→ K3S Deployment
→ Pod
→ Service
→ Ingress
→ Browser

但此前部署仍然是手动的：

本地写代码
→ 本地 docker build
→ 手动 push 到 GHCR
→ SSH 登录服务器
→ kubectl set image
→ 等待 Pod 更新
→ 浏览器验证

这条链路可以跑通，但每次发布都手动执行，容易出错。
这一篇的目标是：
使用 GitHub Actions，把构建镜像、推送 GHCR、更新 K3S Deployment 的过程自动化。

1. 自动发布目标
   最终希望实现：

代码合并到 release 分支
↓
触发 GitHub Actions
↓
构建 Docker 镜像
↓
推送镜像到 GHCR
↓
SSH 登录 K3S 服务器
↓
kubectl set image 更新 Deployment
↓
等待 rollout 完成
↓
浏览器访问最新版本

也就是把手动流程固化成自动化流水线。

2. 为什么使用 release 分支？
   当前项目没有设计复杂分支模型。
   只使用一个 release 分支作为发布入口。
   流程：

feature/dev 分支开发
↓
创建 PR 到 release
↓
合并 PR
↓
触发 GitHub Actions 发布

这样做的好处：

发布动作明确
不会每次 push 都部署
保留基本 PR 合并流程
后续方便加测试、检查、审批

当前阶段不做 dev、staging、production 多环境。
MVP 目标是先跑通一条可靠发布链路。

3. GitHub Actions 做哪些事？
   workflow 主要步骤：

checkout 代码
设置 Docker Buildx
登录 GHCR
计算新版本 tag
构建 linux/amd64 镜像
推送版本 tag
推送 latest
SSH 到 K3S 服务器
执行 kubectl set image
执行 kubectl rollout status

关键部署信息：

镜像仓库：GHCR
K3S namespace：default
Deployment：my-web-app
Container：my-web-app
Service：my-web-svc
容器端口：3000

这些值都来自前面手动部署阶段验证过的配置。
CI/CD 的本质是固化已验证流程。
不要在手动部署还没跑通时就急着写 workflow。

4. 镜像 tag 自动递增
   如果每次部署都用 latest，虽然简单，但不利于排查和回滚。
   因此发布时需要生成明确版本 tag。
   当前规则：

0.1.8 -> 0.1.9
0.1.99 -> 0.2.0

每次发布都会推送两个 tag：

明确版本 tag
latest

Deployment 使用明确版本 tag。
这样可以清楚知道线上当前运行的镜像版本。

5. GitHub Secrets 配置
   workflow 需要使用一些敏感信息：

GHCR_TOKEN
K3S_SSH_HOST
K3S_SSH_PORT
K3S_SSH_USER
K3S_SSH_PRIVATE_KEY

用途：

GHCR_TOKEN：
登录 GHCR，推送镜像

K3S*SSH*\*：
通过 SSH 登录服务器，执行 kubectl

这些信息必须放在 GitHub Actions Secrets 中。
不要写入仓库。
尤其是：

GitHub token
SSH 私钥
服务器 IP

这些都属于部署权限信息。

6. SSH 执行 K3S 更新
   镜像推送完成后，workflow 通过 SSH 登录 K3S 服务器。
   核心命令：

kubectl set image deployment/my-web-app my-web-app=新镜像
kubectl rollout status deployment/my-web-app

kubectl set image 会更新 Deployment 中容器的 image。
Kubernetes 随后触发 rollout：

创建新 Pod
等待新 Pod Ready
逐步替换旧 Pod
完成发布

即使当前只是单节点 K3S，这套 Deployment rollout 机制依然有效。

7. 第一次自动发布验证
   测试流程：

修改代码
提交到开发分支
创建 PR 到 release
合并 PR
观察 GitHub Actions
等待 workflow 成功
访问域名验证页面

Actions 执行成功后，浏览器访问域名，页面已经变成最新版本。
此时部署方式从：

手动 build / push / set image

变成了：

合并 PR 到 release 自动发布

8. 项目级发布规则
   自动发布跑通后，可以把 PR 和发布操作沉淀成项目规则。
   比如：

创建 PR 时默认合并到 release
合并前检查 base/head 分支
检查是否误提交密钥
检查 workflow 和 deployment 配置是否被误改
合并后查看 release workflow 状态
发布后访问域名验证
发布后查看 Pod 状态和日志

很多线上问题不是代码问题，而是流程问题。
把流程固化下来，可以减少人为操作错误。

9. 一个真实问题：Nuxt 静态资源 500
   自动发布跑通后，后面遇到过一个线上问题。
   页面 HTML 可以返回，但浏览器请求：

/\_nuxt/\*.js

时出现 500。
日志显示 Nitro 在查找：

/app/.output/server/chunks/public/\_nuxt/xxx.js

但实际构建产物在：

/app/.output/public/\_nuxt

最后通过修改 Dockerfile，把 .output/public 同步到 Nitro 运行时查找的路径，问题解决。
修复完成后，重新走 PR 到 release 的流程。
GitHub Actions 自动构建、推送、部署。
这次更能体现自动化发布的价值：

修复代码
↓
合并 release
↓
自动构建镜像
↓
自动更新 K3S
↓
线上验证

如果还是手动部署，修复一次线上问题要重复很多操作。
有 CI/CD 后，迭代速度和稳定性都会更好。

10. 当前阶段结果
    这一阶段完成了：

创建 release 分支作为发布入口
配置 GitHub Actions workflow
合并到 release 自动触发发布
自动构建 Docker 镜像
自动推送到 GHCR
自动递增版本 tag
自动推送 latest
通过 SSH 登录 K3S 服务器
自动执行 kubectl set image
自动等待 rollout 完成
沉淀项目级 PR / release 流程

部署链路升级为：

Code
→ PR to release
→ GitHub Actions
→ Docker Build
→ GHCR
→ SSH
→ kubectl set image
→ K3S Rollout
→ Browser

11. 排查经验
    11.1 Actions 成功不代表服务一定正常
    workflow 成功只说明命令执行成功。
    发布后仍然需要检查：

页面是否能访问
Pod 是否 Running
rollout 是否完成
日志是否有 error
静态资源是否正常加载

11.2 Secrets 不要写进仓库
以下信息必须放到 GitHub Secrets：

GHCR token
SSH 私钥
服务器地址
服务器用户

11.3 不要只依赖 latest
建议每次发布都生成明确版本号。
Deployment 使用版本 tag，方便排查。
11.4 先手动，再自动化
CI/CD 的前提是手动流程已经跑通。
否则 workflow 失败时，排查范围会非常大。

12. 总结
    这一篇完成了从手动部署到自动发布的升级。
    原来的流程：

本地 build
→ 手动 push
→ 手动 SSH
→ 手动 set image

现在变成：

合并 PR 到 release
→ GitHub Actions 自动构建
→ 自动推送 GHCR
→ 自动更新 K3S Deployment

这一步之后，项目有了自己的发布流水线。
后续每次修复和迭代，都可以通过同一条流程发布到线上。
下一篇继续记录：
为什么暂时放弃 Nacos，先用 K3S ConfigMap 和 Secret 管理配置与敏感信息。
