export function useAgentRun() {
  const status = ref<'idle' | 'running' | 'success' | 'failed'>('idle')
  const runId = ref<string>()
  const traceId = ref<string>()

  return {
    status,
    runId,
    traceId
  }
}
