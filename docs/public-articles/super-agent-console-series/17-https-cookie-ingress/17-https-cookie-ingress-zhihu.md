知乎

标题

上线后才发现，HTTPS、Cookie 和环境变量都不是小事

正文

当我觉得公网试用的保护措施差不多做好之后，就开始部署到线上。

本来以为这一步会比较顺。

毕竟前面 K3S、GitHub Actions、GHCR、ConfigMap、Secret、MySQL、CLS 都已经跑通过。

代码合到 `release` 分支后，GitHub Actions 自动构建镜像，推到镜像仓库，再 SSH 到服务器执行 `kubectl set image`。

从流程上看，已经挺完整了。

但真正部署之后，还是遇到了一串问题。

这些问题都不大。

但每一个都足够让我线上功能不可用。

## 第一个问题：登录一直 401

我在线上输入准备好的 access code，结果一直提示 401。

第一反应是 Secret 没注入。

因为 access code 是通过 Kubernetes Secret 注入到 Pod 里的。

如果服务端拿不到环境变量，自然就无法校验访问码。

于是我进到服务器里查环境变量。

结果发现 Pod 里确实能读到：

```txt
ACCESS_CODES
```

我又检查 Secret，也没问题。

这就有点奇怪了。

环境变量在，输入的 code 也对，为什么服务端就是判断失败？

后来排查下来，问题出在 Nuxt 生产环境的 `runtimeConfig`。

我原本以为服务端读取配置时，通过 `runtimeConfig` 就能拿到所有变量。

但在生产构建后，某些私有配置如果没有按 Nuxt 的规则注入，读取结果会和我预期不一样。

最后我做了一个修复。

服务端私有配置优先读取：

```txt
process.env.KEY
```

如果没有，再兼容：

```txt
process.env.NUXT_KEY
```

最后才读取 Nuxt `runtimeConfig` 里的值。

也就是说：

```txt
ACCESS_CODES
↓
NUXT_ACCESS_CODES
↓
runtimeConfig.accessCodes
```

这一步修完后，线上登录才正常。

这件事给我的提醒是：

环境变量不是“写进 Secret 就结束”。

从 Secret 到 Pod，再到 Node 进程，再到 Nuxt 运行时配置，中间还有好几层。

任何一层理解错，线上行为就可能和本地不一样。

## 第二个问题：Cookie 没有带上

登录修好后，我又发现有些接口请求里没有带 cookie。

这个问题就更像浏览器行为了。

后来想起来，我在生产环境里给 cookie 设置了 `secure`。

`secure cookie` 只有在 HTTPS 下才会被浏览器发送。

而当时我的网站还跑在 HTTP 上。

所以现象就变成了：

```txt
登录接口看起来成功
但浏览器不会在后续 HTTP 请求里发送 secure cookie
后续接口仍然像未登录
```

这件事提醒我：

只要涉及登录，HTTPS 就不是“以后再说”的优化项。

它是必须项。

尤其是公网项目。

只要使用 cookie、登录态、管理员页面，HTTP 就很快会变成问题。

于是我开始给 K3S 上 HTTPS。

## 第三个问题：HTTPS 证书签好了，但访问不通

我用的是这一套：

```txt
Traefik
cert-manager
Let's Encrypt
Ingress TLS
```

过程看起来很标准。

证书也很快签发成功。

`kubectl get certificate` 显示：

```txt
READY=True
```

看到这里，我以为事情已经结束了。

但新的问题又来了：

HTTPS 访问不通。

我先怀疑腾讯云防火墙。

于是去控制台开放 443。

还是不通。

又怀疑 Traefik 没监听 443。

看了 Service，发现 80 和 443 都在。

再查 Ingress，也有 TLS 配置。

最后才发现，是我把 Ingress backend port 配错了。

我把它改成了 3000。

但 Ingress 后面接的是 Service，不是容器。

Nuxt 容器监听 3000 没错。

但是 Ingress backend 应该填 Service port。

Service 再通过 targetPort 转发到容器的 3000。

正确链路应该是：

```txt
Ingress
→ Service port
→ Service targetPort
→ Container port
```

而不是：

```txt
Ingress
→ Container port
```

这类问题以前看文档时觉得很简单。

但真正自己配的时候，很容易在某一步顺手写错。

尤其是当 Deployment、Service、Ingress 三层都在的时候，端口名和端口号很容易混。

改完之后，HTTPS 终于通了。

登录、cookie、管理员页面、反馈提交也都恢复正常。

## 顺手修掉配置泄露问题

这一轮排查里，还有一个小问题也顺手修了。

我之前写了一个 `config-demo` 接口，用来验证环境变量读取。

一开始它会返回一些服务端配置状态。

但后来发现，它把这些具体值也打印出来了：

```txt
modelProvider
modelName
modelBaseUrl
```

虽然没有直接泄露 API Key，但这仍然不是一个好习惯。

配置检查接口应该只返回“是否加载成功”。

而不是把服务端配置细节暴露给浏览器。

所以我把它改成了脱敏输出。

只保留类似：

```txt
modelApiKeyLoaded: true
databaseUrlLoaded: true
accessCodesCount: 20
```

不再输出具体配置值。

这件事也提醒我：

调试接口很方便。

但调试接口一旦部署到公网，就必须重新看一遍它会不会暴露过多信息。

尤其是涉及模型、数据库、访问码、环境变量这些配置时，更要谨慎。

## 线上问题往往不是一个大 bug

这一阶段下来，我最大的感受是：

线上问题往往不是一个巨大的 bug。

而是一串小配置叠在一起。

比如：

```txt
环境变量读取方式
Cookie secure 策略
HTTP / HTTPS
Ingress port
Service port
Secret 注入
配置接口脱敏
```

每一个单独看都不复杂。

但它们串在一起，就会变成一个真实的线上问题。

比如登录 401，看起来像权限问题。

但它可能是环境变量读取问题。

Cookie 不生效，看起来像前端请求问题。

但它可能是 HTTPS 问题。

HTTPS 不通，看起来像证书问题。

但它可能是 Ingress backend port 配错。

这些问题如果只看表象，很容易走偏。

必须一层一层拆：

```txt
浏览器请求有没有 cookie
服务端有没有收到 cookie
Pod 里有没有环境变量
Secret 有没有正确注入
Ingress 有没有打到 Service
Service 有没有转到容器
HTTPS 证书有没有 Ready
防火墙有没有开 443
```

这样才能定位到真正的问题。

## 上线不是把代码放到服务器上

以前做前端时，我更多关注页面有没有报错、接口有没有返回。

如果线上有问题，很多时候会等后端或运维同事查日志、查网关、查配置。

但这次自己从服务器、K3S、HTTPS、Cookie 一路排下来，感觉很不一样。

我开始更具体地理解：

上线不是把代码放到服务器上。

上线是让代码在真实网络、真实浏览器、真实配置里稳定工作。

本地能跑，只能说明代码逻辑大概没问题。

但线上还会考验：

```txt
配置有没有注入
Cookie 策略是否匹配协议
HTTPS 是否可用
Ingress 是否正确路由
Service 端口是否配置正确
调试接口是否安全
```

这些都不是页面功能。

但它们决定了用户能不能真正使用。

这也是我这次“重新部署自己”过程里很重要的一课。

做一个 AI Agent Demo，不只是把模型接进来。

也不是只要 Tool Calling、SSE、数据库落库能跑。

当它真的部署到公网以后，还要面对真实的浏览器策略、真实的网络协议、真实的配置管理和真实的安全边界。

这些看起来很琐碎。

但它们正是从“本地 Demo”走向“可试用产品”必须补上的部分。
