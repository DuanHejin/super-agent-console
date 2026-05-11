import type { AgentEvent } from '../types/agent-event'
import type { CreateConversationMessageResponse } from '../types/agent-run'

export function useAgentRun() {
  const status = ref<'idle' | 'running' | 'success' | 'failed'>('idle')
  const conversationId = ref<string>()
  const messageId = ref<string>()
  const runId = ref<string>()
  const traceId = ref<string>()
  const input = ref('')
  const events = ref<AgentEvent[]>([])
  const finalAnswer = ref('')
  const error = ref<string>()

  const { openAgentStream } = useSseStream()

  function applyEvent(event: AgentEvent) {
    conversationId.value = event.conversationId ?? conversationId.value
    messageId.value = event.messageId ?? messageId.value
    runId.value = event.runId
    traceId.value = event.traceId
    events.value.push(event)

    if (event.eventType === 'model_delta') {
      finalAnswer.value += event.content
    }

    if (event.eventType === 'run_finished') {
      status.value = 'success'
    }

    if (event.eventType === 'run_failed') {
      status.value = 'failed'
      error.value = event.errorMessage
    }
  }

  async function runMock() {
    status.value = 'running'
    error.value = undefined
    events.value = []
    finalAnswer.value = ''
    messageId.value = undefined
    runId.value = undefined
    traceId.value = undefined

    try {
      const createRunResponse = await $fetch<CreateConversationMessageResponse>('/api/conversations/messages', {
        method: 'POST',
        body: {
          conversationId: conversationId.value,
          input: input.value,
          clientRequestId: crypto.randomUUID()
        }
      })

      conversationId.value = createRunResponse.conversationId
      messageId.value = createRunResponse.messageId
      runId.value = createRunResponse.runId
      traceId.value = createRunResponse.traceId

      await openAgentStream({
        runId: createRunResponse.runId,
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
    conversationId.value = undefined
    messageId.value = undefined
    runId.value = undefined
    traceId.value = undefined
    input.value = ''
    events.value = []
    finalAnswer.value = ''
    error.value = undefined
  }

  return {
    status,
    conversationId,
    messageId,
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
