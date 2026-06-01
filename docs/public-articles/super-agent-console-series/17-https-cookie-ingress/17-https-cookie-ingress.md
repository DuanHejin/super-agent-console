Codex

## 上线后才发现，HTTPS、Cookie 和环境变量都不是小事

当我觉得公网试用的保护措施差不多做好之后，就开始部署到线上。

本来以为这一步会比较顺。

毕竟前面 K3S、GitHub Actions、GHCR、ConfigMap、Secret、MySQL、CLS 都已经跑通过。

代码合到 release 分支后，GitHub Actions 自动构建镜像，推到镜像仓库，再 SSH 到服务器执行 `kubectl set image`。

从流程上看，已经挺完整了。

但真正部署之后，还是遇到了一串问题。

第一个问题是登录 401。

我在线上输入准备好的 access code，结果一直提示 401。

第一反应是 Secret 没注入。

于是我进到服务器里查环境变量。

结果发现 Pod 里确实能读到 `ACCESS_CODES`。

我又检查 Secret，也没问题。

这就有点奇怪了。

环境变量在，输入的 code 也对，为什么服务端就是判断失败？

后来排查下来，问题出在 Nuxt 生产环境的 runtimeConfig。

我原本以为服务端读取配置时，通过 runtimeConfig 就能拿到所有变量。

但在生产构建后，某些私有配置如果没有按 Nuxt 的规则注入，读取结果会和我预期不一样。

最后我做了一个修复：

服务端私有配置优先读取 `process.env.KEY`。

如果没有，再兼容 `process.env.NUXT_KEY`。

最后才读取 Nuxt runtimeConfig 里的值。

也就是说：

```txt
ACCESS_CODES
↓
NUXT_ACCESS_CODES
↓
runtimeConfig.accessCodes
```

这一步修完后，线上登录才正常。

第二个问题是 Cookie。

登录成功之后，我发现有些接口请求里没有带 cookie。

这就更像浏览器问题。

后来想起来，我在生产环境里给 cookie 设置了 secure。

secure cookie 只有在 HTTPS 下才会被浏览器发送。

而当时我的网站还跑在 HTTP 上。

所以现象就变成了：

```txt
登录接口似乎成功
浏览器拿不到或不发送 cookie
后续接口仍然像未登录
```

这件事提醒我：

只要涉及登录，HTTPS 就不是“以后再说”的优化项，而是必须项。

于是我开始给 K3S 上 HTTPS。

我用的是：

```txt
Traefik
cert-manager
Let's Encrypt
Ingress TLS
```

过程看起来很标准。

证书也很快签发成功了。

`kubectl get certificate` 显示 `READY=True`。

但新的问题又来了：

HTTPS 访问不通。

我先怀疑腾讯云防火墙，于是去控制台开放 443。

还是不通。

又怀疑 Traefik 没监听 443，看了 Service，发现 80 和 443 都在。

再查 Ingress，也有 TLS 配置。

最后才发现，是我把 Ingress backend port 配错了。

我把它改成了 3000。

但 Ingress 后面接的是 Service，不是容器。

Nuxt 容器监听 3000 没错。

但是 Ingress backend 应该填 Service port。

Service 再通过 targetPort 转发到容器的 3000。

正确理解应该是：

```txt
Ingress → Service port → Service targetPort → Container port
```

而不是：

```txt
Ingress → Container port
```

这类问题以前看文档时觉得很简单。

但真正自己配的时候，很容易在某一步顺手写错。

改完之后，HTTPS 终于通了。

登录、cookie、管理员页面、反馈提交也都恢复正常。

这一轮排查里，还有一个小问题也顺手修了。

我之前写了一个 config-demo 接口，用来验证环境变量读取。

一开始它会返回一些服务端配置状态。

但后来发现，它把 `modelProvider`、`modelName`、`modelBaseUrl` 这些具体值也打印出来了。

虽然没有直接泄露 API Key，但这仍然不是一个好习惯。

配置检查接口应该只返回“是否加载成功”，而不是把服务端配置细节暴露给浏览器。

所以我把它改成了脱敏输出。

只保留类似：

```txt
modelApiKeyLoaded: true
databaseUrlLoaded: true
accessCodesCount: 20
```

不再输出具体配置值。

这一阶段下来，我最大的感受是：

线上问题往往不是一个巨大的 bug。

而是一串小配置叠在一起。

比如：

```txt
环境变量读取方式
cookie secure 策略
HTTP / HTTPS
Ingress port
Service port
Secret 注入
配置接口脱敏
```

每一个单独看都不复杂。

但它们串在一起，就会变成一个真实的线上问题。

以前做前端时，我更多关注页面有没有报错、接口有没有返回。

这次自己从服务器、K3S、HTTPS、Cookie 一路排下来，才更清楚地感觉到：

上线不是把代码放到服务器上。

上线是让代码在真实网络、真实浏览器、真实配置里稳定工作。

这也是我这次“重新部署自己”过程里很重要的一课。
