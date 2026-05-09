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

  const { openAgentStream } = useSseStream()

  function applyEvent(event: AgentEvent) {
    runId.value = event.runId
    traceId.value = event.traceId
    events.value.push(event)

    if (event.type === 'final_answer_delta') {
      finalAnswer.value += event.content
    }

    if (event.type === 'agent_done') {
      status.value = 'success'
    }

    if (event.type === 'agent_error') {
      status.value = 'failed'
      error.value = event.error
    }
  }

  async function runMock() {
    status.value = 'running'
    error.value = undefined
    events.value = []
    finalAnswer.value = ''
    runId.value = undefined
    traceId.value = undefined

    try {
      await openAgentStream({
        input: input.value,
        onEvent: applyEvent
      })

      if (status.value === 'running') {
        status.value = 'success'
      }
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
