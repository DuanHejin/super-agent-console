import type { AgentEvent } from '../types/agent-event'

interface MockAgentRunResponse {
  runId: string
  traceId: string
  events: AgentEvent[]
  finalAnswer: string
}

export function useAgentRun() {
  const status = ref<'idle' | 'running' | 'success' | 'failed'>('idle')
  const runId = ref<string>()
  const traceId = ref<string>()
  const input = ref('')
  const events = ref<AgentEvent[]>([])
  const finalAnswer = ref('')
  const error = ref<string>()

  async function runMock() {
    status.value = 'running'
    error.value = undefined
    events.value = []
    finalAnswer.value = ''
    runId.value = undefined
    traceId.value = undefined

    try {
      const result = await $fetch<MockAgentRunResponse>('/api/agent/mock', {
        method: 'POST',
        body: {
          input: input.value
        }
      })

      runId.value = result.runId
      traceId.value = result.traceId
      events.value = result.events
      finalAnswer.value = result.finalAnswer
      status.value = 'success'
    } catch (runError) {
      status.value = 'failed'
      error.value = runError instanceof Error ? runError.message : 'Mock Agent Run failed'
    }
  }

  function clearRun() {
    status.value = 'idle'
    runId.value = undefined
    traceId.value = undefined
    input.value = ''
    events.value = []
    finalAnswer.value = ''
    error.value = undefined
  }

  return {
    status,
    runId,
    traceId,
    input,
    events,
    finalAnswer,
    error,
    runMock,
    clearRun
  }
}
