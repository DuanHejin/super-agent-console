# K3S ConfigMap / Secret 配置示例

本项目当前通过环境变量读取运行配置。本地开发使用 `.env.local`，生产环境使用 K3S ConfigMap / Secret 注入同一组 key。

## 配置分组

ConfigMap 保存非敏感配置：

- `NUXT_PUBLIC_APP_NAME`
- `NUXT_PUBLIC_APP_VERSION`
- `NUXT_PUBLIC_DEPLOY_ENV`
- `NUXT_PUBLIC_CONFIG_DEMO_TEXT`
- `NUXT_PUBLIC_SITE_URL`
- `APP_NAME`
- `APP_VERSION`
- `ARK_BASE_URL`
- `ARK_MODEL_ID`
- `LOG_LEVEL`
- `MOCK_MODEL_ENABLED`

Secret 保存敏感配置：

- `DATABASE_URL`
- `ARK_API_KEY`
- `DEMO_SERVER_TOKEN`

`NUXT_PUBLIC_*` 会通过 Nuxt `runtimeConfig.public` 暴露给浏览器，不能放敏感信息。

## 部署到 K3S

先应用 ConfigMap：

```bash
kubectl apply -f k8s/configmap.yaml
```

Secret 示例文件不能直接用于生产。推荐在服务器上用真实值创建：

```bash
kubectl create secret generic super-agent-console-secret \
  -n default \
  --from-literal=DATABASE_URL='mysql://prod-user:prod-password@prod-host:3306/super_agent_console' \
  --from-literal=ARK_API_KEY='real-ark-api-key' \
  --from-literal=DEMO_SERVER_TOKEN='real-demo-server-token' \
  --dry-run=client -o yaml | kubectl apply -f -
```

给现有 Deployment 注入 ConfigMap 和 Secret：

```bash
kubectl patch deployment my-web-app -n default --type='strategic' --patch-file k8s/deployment-env-patch.yaml
```

重启 Pod，让环境变量重新注入：

```bash
kubectl rollout restart deployment/my-web-app -n default
kubectl rollout status deployment/my-web-app -n default
```

验证：

```bash
kubectl exec -n default deploy/my-web-app -- printenv NUXT_PUBLIC_CONFIG_DEMO_TEXT
kubectl exec -n default deploy/my-web-app -- printenv DEMO_SERVER_TOKEN
```

浏览器打开首页后，DevTools Console 应能看到：

- `[config-demo] browser public runtime config`
- `[config-demo] server config status`

第二条日志只会展示敏感配置是否已加载，不会输出敏感值。
