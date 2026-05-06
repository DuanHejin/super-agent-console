<template>
  <main class="deploy-page">
    <h1>Deploy Info</h1>
    <dl>
      <div>
        <dt>App</dt>
        <dd>{{ config.public.appName }}</dd>
      </div>
      <div>
        <dt>Version</dt>
        <dd>{{ config.public.appVersion }}</dd>
      </div>
      <div>
        <dt>Environment</dt>
        <dd>{{ config.public.nodeEnv }}</dd>
      </div>
    </dl>
  </main>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
</script>

<style scoped>
.deploy-page {
  min-height: 100vh;
  padding: 40px;
  color: #172026;
  background: #f5f7f8;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

h1 {
  margin: 0 0 24px;
  font-size: 32px;
  letter-spacing: 0;
}

dl {
  display: grid;
  max-width: 560px;
  gap: 12px;
  margin: 0;
}

div {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 16px;
  border: 1px solid #dce3e6;
  border-radius: 8px;
  background: #fff;
}

dt {
  color: #526068;
}

dd {
  margin: 0;
  font-weight: 700;
}
</style>
