<template>
  <section class="panel">
    <h2>AI Output</h2>
    <p v-if="status === 'running' && !analysisContent && !content">Mock Agent 正在建立 SSE 连接。</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="analysisContent || content">
      <div v-if="status === 'running'" class="loading-line">
        <span class="spinner" aria-hidden="true"></span>
        <span>Agent 正在生成</span>
      </div>
      <section v-if="analysisContent" class="stream-block">
        <h3>Model Analysis</h3>
        <pre>{{ analysisContent }}</pre>
      </section>
      <section v-if="content" class="stream-block">
        <h3>Final Answer</h3>
        <pre>{{ content }}</pre>
      </section>
    </div>
    <p v-else>等待 Agent 输出。</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  analysisContent: string
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

h3 {
  margin: 0 0 8px;
  color: #526068;
  font-size: 14px;
  letter-spacing: 0;
}

p {
  margin: 0;
  color: #526068;
}

.stream-block + .stream-block {
  margin-top: 16px;
}

.loading-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #526068;
  font-size: 13px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #dce3e6;
  border-top-color: #2563eb;
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
