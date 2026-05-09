<template>
  <section class="agent-console">
    <AgentInput
      v-model="input"
      :disabled="status === 'running'"
      @mock-run="runMock"
      @clear="clearRun"
    />
    <AgentStreamOutput
      :content="finalAnswer"
      :error="error"
      :status="status"
    />
    <AgentTimeline :events="events" />
    <RunMetaBar
      :run-id="runId"
      :trace-id="traceId"
      :status="status"
    />
  </section>
</template>

<script setup lang="ts">
const {
  status,
  runId,
  traceId,
  input,
  events,
  finalAnswer,
  error,
  runMock,
  clearRun
} = useAgentRun()
</script>

<style scoped>
.agent-console {
  display: grid;
  gap: 16px;
}
</style>
