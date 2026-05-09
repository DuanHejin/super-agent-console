<template>
  <section class="panel">
    <h2>AI Output</h2>
    <p v-if="status === 'running' && !content">Mock Agent 正在建立 SSE 连接。</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <pre v-else-if="content">{{ content }}</pre>
    <p v-else>等待 Agent 输出。</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  content: string
  error?: string
  status: 'idle' | 'running' | 'success' | 'failed'
}>()
</script>

<style scoped>
.panel {
  min-height: 160px;
}

h2 {
  margin: 0 0 12px;
  font-size: 18px;
  letter-spacing: 0;
}

p {
  margin: 0;
  color: #526068;
}

pre {
  margin: 0;
  color: #172026;
  font-family: inherit;
  line-height: 1.7;
  white-space: pre-wrap;
}

.error {
  color: #9d2b2b;
}
</style>
