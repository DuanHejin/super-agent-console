掘金版
标题
Nuxt3 AI Agent 控制台实战 02：从 TKE 改成 K3S，单节点跑通 Kubernetes 部署链路
正文
上一篇记录了项目的第一步：购买域名和香港轻量应用服务器，并通过宿主机 Nginx 验证公网访问链路。
第一阶段的链路是：

Browser
→ Domain
→ DNS
→ Server Public IP
→ Nginx

这一篇继续往下走。
目标是把入口从宿主机 Nginx 切换到 Kubernetes Ingress，并跑通：

Browser
→ Domain
→ Server Public IP
→ K3S Ingress
→ Service
→ Pod

原计划使用腾讯云 TKE。
但实际推进时发现，轻量应用服务器不适合作为 TKE 节点，所以方案调整为在服务器上自建单节点 K3S。

1. 原计划：使用腾讯云 TKE
   一开始的设想是：

Nuxt 应用
→ Docker 镜像
→ 镜像仓库
→ 腾讯云 TKE
→ Ingress 暴露服务
→ 配置管理
→ CLS 日志采集

这个方案的优点很明显：

托管 Kubernetes，少维护集群
更接近公司生产环境
方便后续练习 Deployment / Service / Ingress
方便接入日志采集和 CI/CD

对个人学习来说，如果资源条件合适，直接使用云厂商托管 K8s 是一个不错的选择。
但实际问题出在服务器类型上。
我购买的是：

腾讯云香港轻量应用服务器

不是标准 CVM。
而 TKE 托管集群需要使用 CVM 作为节点。
这意味着，如果继续使用 TKE，需要重新购买 CVM，并额外考虑节点规格、网络、负载均衡等资源。
这和我一开始的目标有冲突。
我的初始目标是：

低成本
免备案
快速试错
先跑通主链路

所以最终放弃 TKE，改为在这台轻量服务器上安装单节点 K3S。

2. 为什么选择 K3S？
   K3S 是一个轻量级 Kubernetes 发行版，适合资源有限的环境、小型集群、边缘节点和开发测试场景。
   对当前这台 2 核 2G 的服务器来说，K3S 更合适。
   选择它的原因：

安装简单
资源占用低
保留 Kubernetes 核心能力
支持 Deployment
支持 Service
支持 Ingress
适合个人练习和小项目部署

我当前并不是要搭建复杂生产环境，而是想练习：

如何部署容器应用
Deployment 如何管理 Pod
Service 如何暴露服务
Ingress 如何绑定域名
后续如何通过 CI/CD 更新镜像版本

这些在 K3S 中都可以完成。

3. 停止宿主机 Nginx
   上一篇中，我安装了宿主机 Nginx，用于验证域名访问服务器。
   当时链路是：

Browser
→ Domain
→ Server IP
→ Host Nginx

但现在要让 K3S Ingress 接管 80 端口，所以宿主机 Nginx 不能继续占用端口。
因此需要先停止宿主机上的 Nginx。
切换前后链路对比：

切换前：
Browser → Domain → Host Nginx

切换后：
Browser → Domain → K3S Ingress → Service → Pod

这一步是从传统服务器部署切换到 Kubernetes 部署的关键。

4. 安装 K3S
   安装完成后，服务器就变成了一个单节点 Kubernetes 环境。
   可以使用 kubectl 查看节点状态和 Pod 状态。
   此时服务器的角色发生了变化：

之前：
一台普通 Linux 服务器，直接运行 Nginx

之后：
一台运行 K3S 的 Kubernetes 节点，由 K3S 管理容器和流量

虽然只是单节点，但 Deployment、Service、Ingress 等核心对象都可以真实使用。
这对理解 Kubernetes 很有帮助。
因为 K8s 不再只是文档里的概念，而是真实接管了：

容器调度
服务暴露
端口入口
应用流量
Pod 生命周期

5. 用 Nginx Demo 验证 K3S 链路
   安装完 K3S 后，不建议马上部署自己的业务项目。
   更稳的方式是先用官方 Nginx 镜像做一个最小 Demo。
   这个 Demo 包含三个核心对象：

Deployment：运行 Nginx 容器
Service：暴露 Nginx Pod
Ingress：配置域名访问规则

目标链路：

Browser
→ Domain
→ Server Public IP
→ K3S Ingress
→ Service
→ Nginx Pod

如果浏览器访问域名后能看到 Nginx 默认页，就说明这次响应来自 K3S 内部的 Nginx Pod，而不是宿主机 Nginx。
这一步可以验证：

DNS 解析正常
服务器公网入口正常
K3S Ingress 正常
Service 转发正常
Pod 响应正常

6. 为什么要先用 Nginx Demo？
   原因很简单：降低排错成本。
   如果一上来就部署 Nuxt3 项目，出问题时可能涉及：

Dockerfile
Node 运行环境
Nuxt build
端口监听
环境变量
Ingress 配置
Service selector
镜像拉取
容器启动命令

排查范围会很大。
而 Nginx 官方镜像足够简单，只需要关注：

Deployment 是否创建成功
Pod 是否 Running
Service 是否能转发
Ingress 是否能接入域名

一旦 Nginx Demo 跑通，说明 K3S 的基础访问链路是没问题的。
后面再部署 Nuxt 应用，问题范围就会缩小很多。

7. 当前完成结果
   这一阶段完成后，状态如下：

确认轻量应用服务器不能直接接入 TKE
放弃原计划的 TKE 托管方案
在香港轻量服务器安装 K3S
停止宿主机 Nginx
让 K3S Ingress 接管公网入口
部署 Nginx Demo 到 K3S
通过域名访问到 K3S 内的 Nginx Pod

访问链路从：

Domain → Host Nginx

升级为：

Domain → K3S Ingress → Service → Pod

这个变化很关键。
后续 Nuxt3 应用就可以作为容器部署到 K3S 中。

8. 这次方案调整的经验
   8.1 云产品之间不一定天然打通
   轻量应用服务器和 CVM 是不同产品。
   使用托管 K8s、负载均衡、私有网络等云能力时，需要提前确认资源类型是否支持。
   8.2 个人项目不一定要复刻生产环境
   生产环境适合使用 TKE 这类托管服务。
   但个人学习项目更关注低成本和可控性。
   在当前阶段，K3S 比 TKE 更适合这个 Demo。
   8.3 先验证基础链路，再部署复杂项目
   部署业务项目前，先用 Nginx Demo 验证 Ingress、Service、Pod 链路。
   这样后续排查会更清晰。
   8.4 方案变化不是失败
   从 TKE 改成 K3S，不代表项目降级。
   它只是根据资源、成本和目标做出的工程取舍。

9. 后续计划
   下一步会进入真正的应用部署：

创建 Nuxt3 项目
编写 Dockerfile
构建 Nuxt3 Docker 镜像
推送到镜像仓库
修改 K3S Deployment 的 image
通过域名访问 Nuxt3 首页

也就是把这次验证过的链路：

Domain → K3S Ingress → Service → Nginx Pod

替换成：

Domain → K3S Ingress → Service → Nuxt3 Pod

10. 总结
    这一篇主要完成了从 TKE 到 K3S 的方案调整，并验证了 K3S 的基础访问链路。
    最终结果：

单节点 K3S 可用
Ingress 接管域名入口
Service 能转发到 Pod
Nginx Demo 能通过域名访问

虽然没有使用原计划的 TKE，但对个人学习来说，K3S 更符合当前目标：

成本低
可控性强
能真实练 Kubernetes 核心对象
方便后续部署 Nuxt3 项目

下一篇继续记录：
如何把 Nuxt3 项目打成 Docker 镜像，并部署到自己的 K3S 单节点集群里。
