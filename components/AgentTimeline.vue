<template>
  <section class="panel">
    <h2>Timeline</h2>
    <ol v-if="events.length">
      <li v-for="event in events" :key="`${event.sequence}-${event.eventType}`">
        <strong>{{ event.sequence }}. {{ event.eventType }}</strong>
        <em v-if="event.message">{{ event.message }}</em>
        <span>{{ event.timestamp }}</span>
      </li>
    </ol>
    <p v-else>等待 Mock Agent Run。</p>
  </section>
</template>

<script setup lang="ts">
import type { AgentEvent } from '../types/agent-event'

defineProps<{
  events: AgentEvent[]
}>()
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

p {
  margin: 0;
  color: #526068;
}
</style>
