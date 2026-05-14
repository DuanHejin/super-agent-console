<template>
  <main class="page-shell">
    <section class="hero">
      <p class="eyebrow">Super Agent Console</p>
      <h1>AI 求职准备 Agent</h1>
      <p class="intro">
        输入岗位 JD 或面试目标后，系统会用大模型拆解岗位要求，调用工具和技能生成准备计划，并把 Agent 的分析、工具调用和最终回答实时展示出来。
      </p>
      <nav v-if="showDebugLinks" class="quick-links">
        <NuxtLink to="/runs">Run 列表</NuxtLink>
        <NuxtLink to="/conversations">Conversation 列表</NuxtLink>
      </nav>
    </section>

    <AgentConsole />
  </main>
</template>

<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const { data: authStatus } = await useFetch<{ authenticated: boolean, userId?: string, isAdmin: boolean }>('/api/auth/me')
const showDebugLinks = computed(() => import.meta.dev || Boolean(authStatus.value?.isAdmin))

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

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.quick-links a {
  color: #2563eb;
  font-size: 14px;
  text-decoration: none;
}

.agent-console {
  margin-top: 40px;
}

p {
  margin: 0;
  color: #526068;
  line-height: 1.65;
  word-break: break-word;
}

@media (max-width: 820px) {
  .page-shell {
    padding: 28px;
  }

  h1 {
    font-size: 34px;
  }
}
</style>
