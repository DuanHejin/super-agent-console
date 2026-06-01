codex

# 用 GitHub Actions 自动发布：把手动部署变成流水线

前面几步做完后，我已经可以把项目部署到 K3S 里了。

当时的链路是：

```txt
本地写代码
→ 本地 Docker build
→ 手动 push 到 GHCR
→ 登录服务器
→ kubectl set image
→ 等待 Pod 更新
→ 浏览器验证
```

这条链路能跑通，已经很重要。

但它还有一个明显问题：

太手动了。

每次改代码，我都要重复一遍构建、推送、登录服务器、更新镜像。

刚开始练习的时候，手动做一遍是有价值的。

因为只有手动跑过，才知道每一步发生了什么。

但如果每次发布都靠手动操作，就很容易出错。

比如：

```txt
忘记切换镜像 tag
推了镜像但没更新 Deployment
更新了 Deployment 但端口没检查
部署失败后不知道卡在哪一步
```

所以这一阶段，我要做的事情是：

把手动部署流程交给 GitHub Actions。

## 为什么用 release 分支触发

一开始我没有设计很复杂的分支模型。

只是创建了一个 `release` 分支，用它作为发布入口。

我的想法是：

```txt
开发分支写代码
→ 创建 PR 到 release
→ 合并后触发 GitHub Actions
→ 自动构建镜像并部署到 K3S
```

这样有几个好处。

第一，发布动作比较明确。

不是每次 push 都部署，而是代码进入 `release` 分支才部署。

第二，流程更接近真实项目。

即使是个人项目，也可以保留一个基本的 PR 和合并过程。

第三，后面方便扩展。

如果以后有测试、代码检查、发布审批，都可以加在这个流程里。

这次我没有一开始就做很复杂的环境区分。

没有 dev、staging、production 三套。

当前阶段只需要先把一个自动发布链路跑通。

## Actions 要做哪些事

我给 GitHub Actions 设计的任务很简单：

```txt
checkout 代码
→ 构建 Docker 镜像
→ 推送到 GHCR
→ SSH 登录 K3S 服务器
→ kubectl set image
→ 等待 rollout 完成
```

这其实就是把我之前手动做的步骤，搬到 GitHub Actions 里执行。

这里有几个关键信息：

```txt
镜像仓库：GHCR
K3S namespace：default
Deployment：my-web-app
Container：my-web-app
Service：my-web-svc
容器端口：3000
```

这些都是前面手动部署阶段已经验证过的。

所以自动化不是凭空来的。

它只是把已经跑通的手动流程固化下来。

这点我觉得很重要。

不要在手动链路还没跑通时就急着写 CI/CD。

否则一旦失败，你很难判断问题到底出在应用、镜像、权限、网络，还是 workflow 本身。

## 版本号自动递增

发布流程里还有一个小问题：

每次构建出来的镜像，tag 怎么定？

如果一直用 `latest`，部署当然可以跑。

但排查问题时会很麻烦。

因为你不知道某一刻线上到底跑的是哪个版本。

所以我把之前写的 build 脚本接进了 Actions。

这个脚本会去 GHCR 查询已有版本，然后自动递增：

```txt
0.1.8  -> 0.1.9
0.1.99 -> 0.2.0
```

每次发布都会生成一个明确的版本 tag，同时也更新 `latest`。

这样线上 Deployment 使用的是版本 tag，而不是只依赖 `latest`。

对个人项目来说，这已经足够用了。

它不复杂，但能减少很多混乱。

## GitHub Secrets

Actions 要完成部署，必须拿到一些敏感信息。

比如：

```txt
GHCR_TOKEN
K3S_SSH_HOST
K3S_SSH_PORT
K3S_SSH_USER
K3S_SSH_PRIVATE_KEY
```

这些不能写进代码仓库。

所以我把它们配置到 GitHub Actions Secrets 里。

这里的分工很清楚：

```txt
GHCR_TOKEN
用于推送镜像到 GHCR

K3S_SSH_*
用于 Actions 登录服务器并执行 kubectl
```

这一步让我对“配置”和“密钥”的边界又清楚了一点。

以前写前端时，很多配置可能只是接口地址、环境名、开关。

但到了部署阶段，很多东西都是真正的权限。

一个 SSH 私钥如果泄露，就意味着别人可能直接登录你的服务器。

所以 Secrets 不是为了让配置更优雅。

而是为了避免把权限写进代码。

## SSH 到服务器执行 kubectl

workflow 构建并推送镜像后，会通过 SSH 登录到我的 K3S 云服务器。

然后执行类似这样的操作：

```txt
kubectl set image deployment/my-web-app my-web-app=新镜像
kubectl rollout status deployment/my-web-app
```

这一步本质上就是把 Deployment 里的 container image 换成新版本。

Kubernetes 会负责创建新的 Pod，等新 Pod ready 后，再逐步替换旧 Pod。

我一开始对 rollout 的感受不深。

但自己看过几次之后，会更清楚它的意义：

发布不是简单地“杀掉旧服务，启动新服务”。

Kubernetes 会尽量让更新过程可控。

虽然我现在只是单节点 K3S，没有复杂的高可用能力，但这个机制本身是一样的。

## 第一次自动发布

workflow 写好后，我做了一次测试。

从开发分支修改代码，提交并 push。

然后创建 PR 到 `release` 分支。

合并之后，GitHub Actions 自动开始执行。

它会依次完成：

```txt
构建镜像
推送 GHCR
SSH 连接服务器
更新 K3S Deployment
等待 rollout 完成
```

等 Actions 成功后，我再访问域名。

页面已经更新成最新版本。

这时候整个部署链路第一次真正自动化了。

之前我需要手动做的事情，现在变成了：

```txt
合并 PR 到 release
```

这一步完成后，剩下的交给流水线。

这对我来说，是一个很明显的变化。

项目不再只是“我能部署”。

而是变成了“项目有自己的发布流程”。

## 项目级 skill

在这一步之后，我还顺手把 PR、review、merge、release 这一套动作，沉淀成了一个项目级 skill。

它的作用不是给用户看的，而是给后续开发过程用的。

比如：

```txt
创建 PR 时，默认从当前开发分支到 release
合并前检查 base/head 是否正确
确认没有误提交密钥
确认 CI/CD 相关文件是否被改动
合并后查看 release workflow 状态
```

这件事有点像把项目里的操作习惯写成规则。

以前我可能不会特别在意这些。

但当项目开始有部署流程后，我发现：

很多错误不是代码写错，而是操作流程不稳定。

把流程沉淀下来，能减少重复确认，也能让后续迭代更稳。

## 一次真实的小插曲

自动发布跑通后，我后来又遇到一个线上问题。

页面 HTML 能返回，但浏览器请求 `/_nuxt/*.js` 时出现 500。

日志里显示 Nitro 在找：

```txt
/app/.output/server/chunks/public/_nuxt/xxx.js
```

但构建产物实际在：

```txt
/app/.output/public/_nuxt
```

最后我修改了 Dockerfile，把 `.output/public` 同步到 Nitro 运行时查找的路径。

修复后，再通过 PR 合并到 `release`。

GitHub Actions 又自动构建、推送、部署。

这次我更明显地感受到自动化的价值。

如果还停留在手动部署阶段，修一个线上问题要重新手动 build、push、登录服务器、set image。

但有了 Actions 之后，我只需要把修复合进 `release`，后面的流程自动完成。

自动化不是为了显得高级。

它真正有用的地方，是在你需要频繁修复、验证、迭代的时候，减少人为操作带来的不确定性。

## 当前结果

这一阶段完成后，我得到的结果是：

```txt
创建 release 分支作为发布入口
配置 GitHub Actions workflow
代码合并到 release 后自动触发发布
Actions 自动构建 Docker 镜像
镜像自动推送到 GHCR
版本 tag 自动递增
Actions 通过 SSH 登录 K3S 服务器
自动执行 kubectl set image
自动等待 rollout 完成
项目级 PR 发布流程被沉淀下来
```

也就是说，项目从“手动部署”进入到了“自动发布”。

这一步完成后，我的关注点也开始变化。

以前我要关心每次怎么部署。

现在我更关心：

```txt
发布流程是否可靠
失败时日志是否清楚
密钥是否安全
分支是否合并正确
线上是否真的更新成功
```

这就是工程化带来的变化。

它不会减少所有复杂度。

但它会把复杂度从“每次手动重复”变成“一条可复用的流程”。

## 给前端和初学者的一点建议

如果你也在做类似练习，我现在会建议：

第一，先手动跑通，再做自动化。

CI/CD 是对已有流程的固化，不是用来替代理解的。

第二，不要一开始就设计过度复杂的分支模型。

个人项目可以先用开发分支到 `release`，把主链路跑通。

第三，Secrets 一定不要写进仓库。

GitHub token、SSH 私钥、服务器地址这些都应该放在 GitHub Actions Secrets 里。

第四，镜像 tag 要明确。

尽量不要只依赖 `latest`。每次发布有版本号，后面排查问题会方便很多。

第五，自动化发布后，也要看结果。

Actions 成功不代表用户一定能正常访问。最终还是要通过域名访问、看日志、确认 Pod 状态。

这就是我重新部署自己的第五步。

我把手动构建、推送和部署，变成了一条 GitHub Actions 流水线。

从这一刻开始，项目不再依赖我手动登录服务器更新镜像。

代码合并到 `release`，它就能自己完成构建和发布。

下一篇，我会继续记录：为什么我最后暂时放弃 Nacos，先用 K3S ConfigMap 和 Secret 管理配置和敏感信息。
