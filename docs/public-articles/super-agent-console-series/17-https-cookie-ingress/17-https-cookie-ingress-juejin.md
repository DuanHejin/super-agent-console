掘金

标题

Nuxt3 AI Agent 控制台实战 16：上线后排查 HTTPS、Cookie、Secret 和 Ingress 端口问题

正文

前面已经完成了公网试用前的几道保护：

```txt
Access Code
Admin Code
用户频控
全站频控
并发限制
输入长度限制
MODEL_ENABLED Kill Switch
Feedback
```

真实模型也已经接入。

接下来就是部署到线上，让朋友可以访问。

部署链路沿用之前已经跑通的流程：

```txt
代码合并 release 分支
↓
GitHub Actions 构建 Docker 镜像
↓
推送到 GHCR
↓
SSH 到 K3S 服务器
↓
kubectl set image 更新 Deployment
↓
等待 rollout 完成
```

从 CI/CD 流程看，已经比较完整。

但真正上线后，还是连续遇到了几个问题。

这篇记录一下这次排查过程。

## 1. 线上登录 401

第一个问题是：

```txt
输入 access code 后一直 401
```

第一反应是 Secret 没有注入。

因为 access code 是通过 Kubernetes Secret 注入到 Pod 的。

所以先检查 Secret。

```bash
kubectl describe secret super-agent-console-secret -n default
```

确认 Secret 里有对应 key。

然后进入 Pod 查看环境变量。

```bash
kubectl exec -it <pod-name> -n default -- sh
printenv | grep ACCESS_CODES
```

结果发现 Pod 内部确实能读到：

```txt
ACCESS_CODES
```

这说明 Secret 注入没有问题。

但服务端校验仍然失败。

继续排查后发现，问题出在 Nuxt 生产环境配置读取。

本来服务端逻辑通过 `runtimeConfig` 读取配置。

但在生产构建后，某些私有配置如果没有完全按 Nuxt 规则注入，读取结果会和预期不一致。

所以最终改成更稳的读取顺序：

```txt
process.env.ACCESS_CODES
↓
process.env.NUXT_ACCESS_CODES
↓
runtimeConfig.accessCodes
```

也就是服务端私有配置优先读真实环境变量。

如果没有，再兼容 Nuxt 前缀变量。

最后才读取 runtimeConfig。

修复后，线上 access code 登录恢复正常。

## 2. Cookie 没有自动携带

登录修复后，又遇到第二个问题。

部分接口请求仍然像未登录。

排查 Network 后发现，请求里没有带 cookie。

这里的问题出在 cookie 配置。

生产环境里设置了：

```txt
Secure
```

`Secure Cookie` 只有在 HTTPS 请求下才会被浏览器发送。

当时网站还跑在 HTTP 上，所以现象就变成了：

```txt
登录接口返回成功
但后续 HTTP 请求不携带 secure cookie
接口继续返回未登录
```

这个问题不是 fetch、axios 或接口逻辑问题。

而是浏览器 cookie 策略问题。

解决方案也很明确：

```txt
上线 HTTPS
```

只要生产环境使用 secure cookie，HTTPS 就不是可选项。

## 3. 给 K3S Ingress 接 HTTPS

当前 K3S 使用 Traefik 作为 Ingress Controller。

HTTPS 方案使用：

```txt
Traefik
cert-manager
Let's Encrypt
Ingress TLS
```

大致步骤是：

```txt
安装 cert-manager
创建 ClusterIssuer
在 Ingress 上增加 cert-manager annotation
配置 tls.hosts 和 secretName
等待证书签发
```

证书签发后查看：

```bash
kubectl get certificate -n default
```

结果显示：

```txt
READY=True
```

说明证书已经正常签发。

但访问 HTTPS 仍然不通。

于是开始排查。

## 4. HTTPS 不通的排查路径

先检查腾讯云防火墙。

确认 443 端口已经开放。

再检查 Traefik Service。

```bash
kubectl get svc -n kube-system
```

确认 Traefik 对外暴露了 80 和 443。

再检查 Ingress。

```bash
kubectl describe ingress <ingress-name> -n default
```

确认 TLS 配置存在。

这些看起来都没问题。

最后定位到 Ingress backend port 配错。

我把 backend port 配成了：

```txt
3000
```

因为 Nuxt 容器监听的是 3000。

但这里忽略了一个关键点：

Ingress backend 后面接的是 Service，不是容器。

正确链路是：

```txt
Ingress
→ Service port
→ Service targetPort
→ Container port
```

所以 Ingress 里应该填的是 Service 暴露的 port。

如果 Service 是：

```yaml
ports:
    - port: 80
      targetPort: 3000
```

那么 Ingress backend 应该写：

```yaml
backend:
    service:
        name: super-agent-console-service
        port:
            number: 80
```

而不是：

```yaml
port:
    number: 3000
```

3000 是容器端口，应该由 Service 的 targetPort 转发过去。

修复后，HTTPS 访问恢复正常。

## 5. Cookie 登录链路恢复

HTTPS 打通后，secure cookie 开始正常工作。

完整链路变成：

```txt
用户访问 https://domain
↓
输入 access code
↓
服务端校验 ACCESS_CODES
↓
写入 httpOnly + secure cookie
↓
浏览器后续请求自动携带 cookie
↓
服务端识别登录态
↓
允许访问 Agent / Admin / Feedback 接口
```

此时：

```txt
登录正常
管理员页面正常
Feedback 提交正常
Run 创建正常
SSE 连接正常
```

也就是说，问题不在 access code 本身。

也不在 cookie 写入代码。

核心是生产环境必须满足 secure cookie 的 HTTPS 前提。

## 6. 配置检查接口脱敏

这次排查里还顺手修了一个配置安全问题。

之前为了验证线上环境变量读取，写了一个 config demo 接口。

它会返回一些服务端配置状态。

最开始返回内容里包括：

```txt
modelProvider
modelName
modelBaseUrl
```

虽然没有直接返回 API Key，但这依然不合适。

因为这些属于服务端配置细节。

公网接口不应该把它们直接暴露给浏览器。

所以改成脱敏输出。

只保留布尔值和数量信息：

```txt
modelApiKeyLoaded: true
databaseUrlLoaded: true
accessCodesCount: 20
adminAccessCodesCount: 1
modelEnabled: true
```

不再输出具体配置值。

配置检查接口的原则应该是：

```txt
只告诉我配置有没有加载
不要告诉我配置具体是什么
```

## 7. 本次排查涉及的关键点

这次上线后主要踩到了几个点：

```txt
Nuxt 生产环境 runtimeConfig 读取
Kubernetes Secret 注入
Pod 环境变量检查
secure cookie 与 HTTPS 的关系
cert-manager 证书签发
Traefik 443 入口
Ingress backend port
Service port / targetPort / containerPort 区别
配置检查接口脱敏
```

每个点单独看都不复杂。

但线上问题往往就是这些小点叠在一起。

比如：

```txt
登录 401
```

可能是：

```txt
Secret 没注入
环境变量读取失败
access code 解析错误
cookie 没带
secure cookie 依赖 HTTPS
```

```txt
HTTPS 不通
```

可能是：

```txt
证书没签发
防火墙没开 443
Traefik 没暴露 443
Ingress TLS 配错
backend port 指向了错误端口
```

所以排查时不能只盯着最终现象。

要把链路拆开看。

## 8. 当前线上链路

修复后，当前线上访问链路是：

```txt
浏览器
↓
https://domain
↓
Traefik Ingress 443
↓
Service port
↓
Service targetPort
↓
Nuxt Container 3000
↓
Nuxt Server API
↓
Secret / ConfigMap / MySQL / CLS / Model Provider
```

登录链路是：

```txt
Access Code
↓
Nuxt Server API 校验环境变量
↓
写入 httpOnly secure cookie
↓
后续同域 HTTPS 请求自动携带 cookie
↓
服务端识别身份
```

模型调用链路是：

```txt
创建 Run
↓
检查 MODEL_ENABLED
↓
检查限频 / 并发 / 输入长度
↓
调用真实模型
↓
推送 AgentEvent
↓
数据库落库
```

到这里，公网试用的基础链路才真正可用。

## 9. 总结

这一阶段最大的感受是：

上线不是把代码发布到服务器就结束。

上线意味着代码要在真实环境里通过一整条链路：

```txt
真实域名
真实浏览器
真实 HTTPS
真实 cookie 策略
真实 Kubernetes 配置
真实 Secret 注入
真实 Ingress 路由
真实服务端环境变量
```

本地跑通，只能说明业务逻辑大体没问题。

但线上能稳定工作，还需要处理很多工程边界。

这次问题主要集中在：

```txt
环境变量读取
secure cookie
HTTPS
Ingress → Service → Container 端口链路
配置接口脱敏
```

这些都不是 Agent 推理核心。

但它们决定了 Agent Console 能不能真正被别人访问和使用。

当前阶段完成后，项目终于从：

```txt
本地可用
```

进一步变成了：

```txt
线上可访问、可登录、可提交反馈、可运行 Agent
```

下一步，就可以继续观察朋友试用后的真实反馈，再根据反馈优化产品体验和 Agent 稳定性。
