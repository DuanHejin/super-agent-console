Codex

# 从本地镜像到 GHCR：让服务器拉到我的应用

上一篇里，我把 Nuxt3 项目装进了 Docker。

这一步完成后，项目已经不只是本地代码，而是变成了一个可以运行的镜像。

但镜像只存在我本机，其实还不算真正可部署。

因为 K3S 在云服务器上。

它要运行我的应用，必须能从某个地方拉到这个镜像。

这就引出了下一步：

我需要一个镜像仓库。

一开始我对镜像仓库的理解很简单：

```txt
本地 build 出镜像
推到远程仓库
服务器从仓库拉镜像
```

听起来和 Git 仓库有点像。

但真正操作时才发现，镜像仓库比代码仓库多了一些部署相关的细节。

比如：

```txt
镜像怎么命名
tag 怎么管理
私有镜像怎么拉取
K3S 里怎么配置认证
Deployment 怎么切换 image
```

这些以前并不是我日常前端工作里最常接触的东西。

但如果要让项目真正跑在线上，这一层绕不开。

## 为什么选择 GHCR

镜像仓库有很多选择。

一开始我也考虑过腾讯云 TCR。

如果前面使用的是腾讯云 TKE，TCR 其实会是一个很自然的选择。

但我的部署方案已经从 TKE 改成了自建 K3S。

代码仓库又放在 GitHub 上。

所以最后我选择了 GitHub Container Registry，也就是 GHCR。

原因很简单：

```txt
代码在 GitHub
镜像也放 GitHub
后面 GitHub Actions 构建后可以直接推镜像
整体链路更短
```

对个人项目来说，这样更省事。

不需要在多个平台之间来回切换，也不用一开始就维护太多云服务账号和权限。

当然，GHCR 也有自己的细节。

比如私有仓库镜像默认不是随便就能拉的，需要配置 token 和 imagePullSecret。

这也是我后面实际踩到和补上的部分。

## 给镜像打版本

最开始我只是手动构建了一个镜像。

比如：

```txt
super-agent-console:0.1.0
```

同时也会打一个：

```txt
latest
```

这样做很直观。

版本号用于明确部署的是哪一个版本，`latest` 用来表示最新镜像。

但很快我就意识到，不能一直手动想版本号。

因为后面如果每次发布都需要自己决定 tag，很容易乱。

所以我写了一个脚本，专门处理 build 和 push。

这个脚本做几件事：

```txt
查询 GHCR 上已有的版本 tag
找到最大的 semver 版本
自动递增 patch
构建 linux/amd64 镜像
推送版本 tag
同时推送 latest
```

版本规则也很简单：

```txt
0.1.8  -> 0.1.9
0.1.99 -> 0.2.0
```

这不是一个很复杂的发布系统。

但对当前阶段来说已经够用。

它至少解决了一个问题：

每次发布的镜像都有明确版本，不会只依赖 `latest`。

这对排查问题很重要。

如果线上出了问题，我可以知道当前 Deployment 用的是哪个镜像 tag。

## 推送镜像到 GHCR

本地镜像构建完成后，下一步就是登录 GHCR 并推送镜像。

这里需要 GitHub token。

token 至少要有：

```txt
write:packages
read:packages
```

`write:packages` 用来推镜像。

`read:packages` 用来后面让服务器拉镜像。

我没有把 token 写到脚本里，而是通过环境变量传进去。

这是一个很基础但很重要的原则：

敏感信息不要写进代码。

以前写前端项目时，环境变量更多是配置不同环境的接口地址。

这次我更明显地感受到：

部署链路里的 token、密钥、私钥，本质上都是系统权限。

一旦写进代码仓库，后面会非常麻烦。

推送成功后，镜像就出现在 GHCR 里。

这时候我已经完成了：

```txt
本地 Docker 镜像
→ GHCR 镜像仓库
```

但还差最后一步：

K3S 要能拉到它。

## K3S 拉取私有镜像

因为我的 GHCR package 是私有的，所以 K3S 不能直接拉。

如果 Deployment 里直接写：

```txt
ghcr.io/xxx/super-agent-console:0.1.0
```

但没有认证信息，Pod 大概率会进入：

```txt
ImagePullBackOff
```

这也是 Kubernetes 里很常见的错误。

它不一定是镜像不存在，也可能是权限不够。

解决方式是给 K3S 创建一个 `imagePullSecret`。

这个 Secret 保存的是拉取 GHCR 镜像需要的认证信息。

然后再把这个 Secret 绑定到 Deployment 上。

这样 Pod 启动时，K3S 才知道用什么凭证去 GHCR 拉镜像。

这个过程让我对 Kubernetes 的 Secret 又多了一点理解。

它不只可以保存业务密钥，也可以保存镜像仓库认证信息。

只是使用场景不同。

## 替换 Nginx Demo 镜像

前面 K3S 里跑的是 Nginx Demo。

Deployment 里的 image 是：

```txt
nginx
```

现在我要把它换成自己的镜像：

```txt
ghcr.io/xxx/super-agent-console:0.1.0
```

这一步可以通过 `kubectl set image` 完成。

但换 image 不是唯一要注意的事情。

Nginx 默认监听 80。

我的 Nuxt Nitro server 监听 3000。

所以还需要检查：

```txt
Deployment containerPort
Service targetPort
Ingress 指向的 Service port
```

如果端口不一致，Pod 可能已经启动成功，但浏览器访问还是不通。

这类问题很容易让人误判。

有时候不是镜像错了，也不是应用没启动，而是 Service 没有把流量转到正确端口。

最终我把 Deployment 的镜像换成自己的 GHCR 镜像，并确认端口配置一致。

然后重新访问域名。

这一次，浏览器看到的是我的 Nuxt 项目首页。

## 这一步带来的变化

从这一步开始，我的部署链路变成了：

```txt
本地代码
→ Docker build
→ GHCR
→ K3S pull image
→ Deployment rollout
→ 浏览器访问
```

和前面相比，这个变化很大。

以前镜像只在我本地。

现在镜像进入了远程仓库，服务器可以从仓库拉取。

这意味着后面自动化才有可能继续做下去。

如果没有镜像仓库，GitHub Actions 就算能 build，也没有稳定的地方放镜像。

K3S 也没有稳定的地方拉镜像。

所以 GHCR 这一层，其实是 CI/CD 的前置条件。

它把本地构建和服务器部署连接了起来。

## 当前结果

这一阶段完成后，我得到的结果是：

```txt
选择 GHCR 作为镜像仓库
本地 Docker 镜像成功推送到 GHCR
镜像支持版本 tag 和 latest tag
编写了 build-and-push 脚本
版本号可以自动递增
K3S 配置了 GHCR imagePullSecret
Deployment 从 Nginx 镜像切换成 Nuxt 项目镜像
通过域名访问到了自己的项目首页
```

也就是说，项目完成了从“本地镜像”到“服务器可拉取镜像”的转换。

这一步不算复杂，但很关键。

因为它让部署链路不再依赖我本机。

镜像已经有了一个远程中转站。

后面要做自动发布，只需要让 GitHub Actions 来完成 build 和 push，再通知 K3S 更新镜像。

## 给前端和初学者的一点建议

如果你也在做类似练习，我现在会建议：

第一，镜像仓库尽量和代码仓库放在同一个平台。

个人项目用 GitHub 代码仓库 + GHCR，会比跨平台组合更简单。

第二，不要只依赖 `latest`。

`latest` 看起来方便，但排查问题时不够清晰。最好每次发布都有明确版本 tag。

第三，私有镜像一定要配置 imagePullSecret。

如果 Pod 出现 `ImagePullBackOff`，不要只怀疑镜像名，也要检查认证权限。

第四，换镜像时顺手检查端口。

从 Nginx 切换到 Nuxt，端口从 80 变成 3000，这是很容易漏掉的细节。

第五，脚本可以先简单。

不需要一开始就做复杂发布系统。先把 build、tag、push 自动化，就已经能减少很多重复操作。

这就是我重新部署自己的第四步。

我把本地 Docker 镜像推到了 GHCR。

从这一刻开始，服务器不再依赖我手动搬运镜像。

它可以从镜像仓库拉到我的应用。

下一篇，我会继续记录：如何把这些手动操作交给 GitHub Actions，让代码合并到 release 分支后自动构建、推送和部署。
