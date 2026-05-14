<template>
  <footer class="run-meta">
    <span>conversationId: {{ conversationId || 'pending' }}</span>
    <span>messageId: {{ messageId || 'pending' }}</span>
    <span>runId: {{ runId || 'pending' }}</span>
    <span>traceId: {{ traceId || 'pending' }}</span>
    <span>status: {{ status }}</span>
    <NuxtLink v-if="runId" class="detail-link" :to="`/runs/${runId}`">查看 Run 详情</NuxtLink>
  </footer>
</template>

<script setup lang="ts">
defineProps<{
  conversationId?: string
  messageId?: string
  runId?: string
  traceId?: string
  status: 'idle' | 'running' | 'success' | 'failed'
}>()
</script>

<style scoped>
.run-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #526068;
  font-size: 14px;
}

.detail-link {
  color: #2563eb;
  text-decoration: none;
}
</style>
