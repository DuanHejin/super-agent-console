<template>
  <section class="panel">
    <h2>Timeline</h2>
    <p v-if="status === 'running'" class="phase-line">
      <span class="dot" aria-hidden="true"></span>
      {{ phase?.label || '运行中' }}：{{ phase?.detail || 'Agent Run 正在执行。' }}
    </p>
    <ol v-if="events.length">
      <li v-for="event in events" :key="`${event.sequence}-${event.eventType}`">
        <strong>{{ event.sequence }}. {{ event.eventType }}</strong>
        <small>{{ event.status }}</small>
        <em v-if="event.name">{{ event.name }}</em>
        <em v-if="event.message">{{ event.message }}</em>
        <pre v-if="shouldShowData(event)">{{ formatEventData(event.data) }}</pre>
        <span>{{ formatLocalDateTime(event.timestamp) }}</span>
      </li>
      <li v-if="status === 'running'" class="timeline-loading">
        <strong>Running</strong>
        <small>streaming</small>
        <em>等待下一条 AgentEvent。</em>
      </li>
    </ol>
    <p v-else-if="status === 'running'" class="loading-line">
      <span class="dot" aria-hidden="true"></span>
      Agent Run 正在启动。
    </p>
    <p v-else>等待 Mock Agent Run。</p>
  </section>
</template>

<script setup lang="ts">
import type { AgentEvent } from '../types/agent-event'
import type { AgentRunPhase } from '../composables/useAgentRun'

defineProps<{
  events: AgentEvent[]
  status: 'idle' | 'running' | 'success' | 'failed'
  phase?: AgentRunPhase
}>()

const { formatLocalDateTime } = useLocalDateTime()

const detailedEventTypes = new Set<AgentEvent['eventType']>([
  'model_call_start',
  'model_tool_call_decision',
  'tool_call_start',
  'tool_progress_delta',
  'skill_start',
  'skill_progress_delta',
  'skill_result',
  'tool_call_result'
])

function shouldShowData(event: AgentEvent) {
  return detailedEventTypes.has(event.eventType)
}

function formatEventData(data: unknown) {
  return JSON.stringify(data, null, 2)
}
</script>

<style scoped>
h2 {
  margin: 0 0 12px;
  font-size: 18px;
  letter-spacing: 0;
}

ol {
  margin: 0;
  padding-left: 20px;
  color: #526068;
}

li {
  margin: 8px 0;
}

.timeline-loading strong {
  color: #2563eb;
}

strong {
  color: #172026;
}

span {
  display: block;
  font-size: 13px;
}

em {
  display: block;
  color: #526068;
  font-size: 13px;
  font-style: normal;
}

small {
  display: inline-block;
  margin-left: 8px;
  color: #526068;
  font-size: 12px;
}

pre {
  max-height: 220px;
  overflow: auto;
  margin: 8px 0;
  padding: 10px;
  border: 1px solid #dce3e6;
  border-radius: 6px;
  background: #f7f9fa;
  color: #172026;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

p {
  margin: 0;
  color: #526068;
}

.loading-line,
.phase-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.phase-line {
  margin-bottom: 12px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #2563eb;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
  }

  50% {
    opacity: 1;
  }
}
</style>
