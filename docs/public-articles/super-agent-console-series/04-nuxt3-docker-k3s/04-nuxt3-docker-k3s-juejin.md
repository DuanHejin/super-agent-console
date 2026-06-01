掘金版
标题
Nuxt3 AI Agent 控制台实战 03：把 Nuxt3 项目打成 Docker 镜像并部署到 K3S
正文
前两篇已经完成了两条基础链路：
第一，域名可以访问服务器。

Browser
→ Domain
→ DNS
→ Server IP
→ Nginx

第二，K3S 已经接管公网入口。

Browser
→ Domain
→ K3S Ingress
→ Service
→ Pod

不过当时 K3S 里跑的还是官方 Nginx Demo。
这一篇开始部署自己的项目：
创建 Nuxt3 项目，将它构建成 Docker 镜像，推送到 GHCR，并替换 K3S 中原来的 Nginx Pod。
最终目标链路：

Browser
→ Domain
→ K3S Ingress
→ Service
→ Nuxt Pod
→ Nuxt 首页

1. 为什么使用 Nuxt3？
   这个项目是一个 AI Agent 控制台 Demo。
   后续会逐步实现：

server/api 接口
模型调用
SSE 流式响应
Agent Timeline
工具调用展示
数据库落库
JSON 日志输出
部署与排障

因此它不是一个纯静态页面项目。
相比普通 Vue SPA，Nuxt3 更适合这个场景：

仍然是 Vue 技术栈
支持页面开发
内置 Nitro Server
可以在 server/api 中写接口
适合后续承载 AI 调用和 SSE 中转逻辑

所以项目技术路线暂定为：

Nuxt3

- Nitro Server API
- Docker
- K3S
- 后续 AI Agent Runtime

2. 创建 Nuxt3 项目骨架
   第一步先创建一个最小 Nuxt3 项目。
   目录上先预留一些后续需要用到的位置：

pages/
components/
composables/
server/api/
server/services/
prisma/
docs/

同时增加几个基础接口：

/api/health
/api/ready
/api/db-check

这几个接口用于后续部署和健康检查。
简单理解：

/api/health：应用进程是否正常
/api/ready：应用是否准备好接收流量
/api/db-check：数据库连接是否正常

即使当前还没有接数据库，也先把结构留出来。
后面进入 K3S 部署后，这些接口可以用于 readinessProbe、livenessProbe 和排障验证。

3. Node 版本问题
   项目初始化后，安装或构建时遇到了一个错误：

The requested module 'node:util' does not provide an export named 'styleText'

原因是当前 Node 版本过低。
Nuxt 相关依赖使用了较新的 Node API，而本机默认还是 Node 18。
解决方式：

统一项目 Node 版本到 Node 22
增加 .nvmrc
增加 package.json engines

这样可以确保本地开发、Docker 构建和后续 CI/CD 环境尽量一致。
这类问题在前端项目里很常见。
很多构建报错不一定是代码问题，而是 Node 版本、包管理器版本或依赖环境不一致导致的。

4. 编写 Dockerfile
   Nuxt3 本地 build 成功后，开始编写 Dockerfile。
   目标：

安装依赖
构建 Nuxt3 项目
保留生产运行产物
启动 Nitro Server

整体采用多阶段构建：

builder 阶段：
npm ci
npm run build

runner 阶段：
拷贝 .output
启动 node .output/server/index.mjs

这样最终运行镜像不需要保留完整源码和开发依赖。
构建产物重点是 Nuxt 的：

.output

容器启动命令类似：

node .output/server/index.mjs

到这里，项目开始从源码形态转变为可运行镜像。

5. 本地 Docker 环境
   本机是 Mac，所以使用 Docker CLI + Colima。
   这里需要注意本机架构。
   如果是 Apple Silicon Mac，本地是 arm64。
   但服务器一般是 amd64。
   所以构建镜像时需要显式指定平台：

linux/amd64

否则可能出现：

本地构建成功
镜像推送成功
服务器拉取成功
Pod 启动失败

这类问题排查起来会比较绕。
因此构建时直接指定目标平台更稳。

6. 构建 linux/amd64 镜像
   构建镜像时，目标平台指定为：

linux/amd64

构建完成后，项目完成了第一次形态转换：

Nuxt3 源码
→ Docker Image

这一步的意义是：
项目不再只依赖本机环境，而是被封装成了一个可以在服务器上运行的镜像。

7. 推送镜像到 GHCR
   镜像构建完成后，先手动推送到 GitHub Container Registry。
   整体流程是：

docker build
docker tag
docker push

镜像地址类似：

ghcr.io/xxx/super-agent-console:version

这里先不急着做 GitHub Actions 自动化。
第一版先手动跑通，有助于理解完整链路。
后续再把这些命令自动化。

8. 替换 K3S 中的镜像
   之前 K3S 里跑的是 Nginx Demo。
   Deployment 的 image 类似：

nginx

现在要替换成自己的 Nuxt3 镜像：

ghcr.io/xxx/super-agent-console:version

可以通过修改 YAML 或者直接 set image。
同时需要注意端口变化。
Nginx 默认监听 80。
Nuxt Nitro Server 默认监听 3000。
所以需要检查并修改：

Deployment containerPort
Service targetPort
Service port
Ingress 指向的 Service

如果 image 改了，但端口没改，Pod 可能正常 Running，但浏览器依然访问不到页面。
这是部署中很常见的问题。

9. 部署后的访问链路
   镜像替换完成后，重新访问域名。
   这时链路变成：

Browser
→ Domain
→ K3S Ingress
→ Service
→ Nuxt Pod
→ Nuxt 首页

当页面从 Nginx 默认页变成 Nuxt 首页时，说明部署成功。
这一步验证了：

镜像构建成功
镜像推送成功
K3S 能拉取镜像
Pod 能启动
Service 能转发到 3000
Ingress 能接入域名流量
Nuxt Server 能正常响应

10. 当前阶段结果
    这一阶段完成了：

创建 Nuxt3 项目
确认本地 dev 可用
确认本地 build 可用
修复 Node 版本问题
编写 Dockerfile
本地安装 Docker / Colima
构建 linux/amd64 镜像
推送镜像到 GHCR
K3S Deployment 替换 image
调整端口配置
通过域名访问 Nuxt3 首页

最终项目完成了从：

本地源码

到：

线上容器应用

的转换。

11. 排查经验
    这一步里比较容易出问题的地方有几个。
    11.1 Node 版本
    Nuxt 依赖可能需要较新的 Node API。
    建议通过：

.nvmrc
package.json engines

固定版本。
11.2 镜像平台
Apple Silicon Mac 构建镜像时，要注意平台。
服务器是 amd64 时，建议构建：

linux/amd64

11.3 容器端口
Nginx 默认 80，Nuxt 默认 3000。
替换镜像时，不要只改 image。
也要检查：

containerPort
Service targetPort

11.4 先手动再自动化
第一次部署建议先手动完成。
理解每一步之后，再引入 GitHub Actions。
否则自动化失败时，很难判断是构建、推送、拉取、部署还是端口配置的问题。

12. 总结
    这一篇完成了 Nuxt3 项目的第一次容器化部署。
    最终链路：

Nuxt3 源码
→ Docker Image
→ GHCR
→ K3S Deployment
→ Pod
→ Service
→ Ingress
→ Domain
→ Browser

对前端来说，这一步很重要。
因为项目不再只是：

npm run dev
npm run build

而是变成了一个可以被容器环境拉取、启动和替换的部署单元。
下一篇继续记录：
如何把手动构建和手动部署流程，改造成 GitHub Actions 自动发布流程。
