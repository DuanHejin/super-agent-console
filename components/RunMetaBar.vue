<template>
  <footer class="run-meta">
    <span>runId: {{ runId || 'pending' }}</span>
    <span>traceId: {{ traceId || 'pending' }}</span>
    <span>status: {{ status }}</span>
  </footer>
</template>

<script setup lang="ts">
defineProps<{
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
</style>
