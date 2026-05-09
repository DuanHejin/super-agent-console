<template>
  <main class="page-shell">
    <section class="hero">
      <p class="eyebrow">Super Agent Console</p>
      <h1>AI Agent 执行链路可视化工程 Demo</h1>
      <p class="intro">
        当前阶段先完成 Nuxt 3 项目骨架、服务端健康检查和 Agent 模块边界，后续逐步接入 SSE、数据库、日志与部署链路。
      </p>
    </section>

    <AgentConsole />

    <section class="grid">
      <article>
        <h2>Agent Console</h2>
        <p>后续这里会承载 JD 输入、Mock Run、Real Run、AI 流式输出和 Agent Timeline。</p>
      </article>
      <article>
        <h2>Runtime Status</h2>
        <p>健康检查接口已预留：<code>/api/health</code>、<code>/api/ready</code>、<code>/api/db-check</code>。</p>
      </article>
      <article>
        <h2>Deployment Layer</h2>
        <p>发布链路将通过 GitHub Actions 构建 GHCR 镜像，并滚动更新香港服务器上的 K3S Pod。</p>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()

onMounted(async () => {
  const publicConfig = {
    appName: runtimeConfig.public.appName,
    appVersion: runtimeConfig.public.appVersion,
    deployEnv: runtimeConfig.public.deployEnv,
    configDemoText: runtimeConfig.public.configDemoText,
    siteUrl: runtimeConfig.public.siteUrl
  }

  console.log('[config-demo] browser public runtime config:', publicConfig)

  const serverConfigStatus = await $fetch('/api/config-demo')

  console.log('[config-demo] server config status:', serverConfigStatus)
})
</script>

<style scoped>
.page-shell {
  min-height: 100vh;
  padding: 48px;
  color: #172026;
  background: #f5f7f8;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.hero {
  max-width: 880px;
}

.eyebrow {
  margin: 0 0 12px;
  color: #3d6b5c;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  max-width: 760px;
  margin: 0;
  font-size: 44px;
  line-height: 1.12;
  letter-spacing: 0;
}

.intro {
  max-width: 760px;
  margin: 20px 0 0;
  color: #526068;
  font-size: 17px;
  line-height: 1.7;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 40px;
}

.agent-console {
  margin-top: 40px;
}

article {
  min-height: 156px;
  padding: 22px;
  border: 1px solid #dce3e6;
  border-radius: 8px;
  background: #fff;
}

h2 {
  margin: 0 0 12px;
  font-size: 18px;
  letter-spacing: 0;
}

p {
  margin: 0;
  color: #526068;
  line-height: 1.65;
  word-break: break-word;
}

code {
  color: #1d5f7a;
}

@media (max-width: 820px) {
  .page-shell {
    padding: 28px;
  }

  h1 {
    font-size: 34px;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
