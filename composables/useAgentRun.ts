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
  const modelAnalysisTypewriter = useTypewriterQueue()
  const finalAnswerTypewriter = useTypewriterQueue()
  const { toolProcesses } = useToolSkillProcess(events)
  const modelAnalysis = modelAnalysisTypewriter.output
  const finalAnswer = finalAnswerTypewriter.output
  const error = ref<string>()
  const currentPhase = computed(() => resolveCurrentPhase(events.value))

  const { openAgentStream } = useSseStream()

  function applyEvent(event: AgentEvent) {
    conversationId.value = event.conversationId ?? conversationId.value
    messageId.value = event.messageId ?? messageId.value
    runId.value = event.runId
    traceId.value = event.traceId
    events.value.push(event)

    if (event.eventType === 'model_text_delta') {
      if (typeof event.data.content === 'string') {
        modelAnalysisTypewriter.enqueue(event.data.content)
      }
    }

    if (event.eventType === 'final_answer_delta') {
      if (typeof event.data.content === 'string') {
        finalAnswerTypewriter.enqueue(event.data.content)
      }
    }

    if (event.eventType === 'agent_done') {
      status.value = 'success'
    }

    if (event.eventType === 'agent_error') {
      status.value = 'failed'
      error.value = typeof event.data.errorMessage === 'string' ? event.data.errorMessage : 'Agent Run failed'
    }
  }

  async function runMock() {
    status.value = 'running'
    error.value = undefined
    events.value = []
    modelAnalysisTypewriter.reset()
    finalAnswerTypewriter.reset()
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
    modelAnalysisTypewriter.reset()
    finalAnswerTypewriter.reset()
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
    toolProcesses,
    currentPhase,
    modelAnalysis,
    finalAnswer,
    error,
    runMock,
    clearRun
  }
}

export interface AgentRunPhase {
  label: string
  detail: string
}

function resolveCurrentPhase(events: AgentEvent[]): AgentRunPhase {
  const latestEvent = events[events.length - 1]

  if (!latestEvent) {
    return {
      label: '准备中',
      detail: '等待 Agent Run 启动。'
    }
  }

  if (latestEvent.eventType === 'agent_done') {
    return {
      label: '已完成',
      detail: 'Agent Run 已完成。'
    }
  }

  if (latestEvent.eventType === 'agent_error') {
    return {
      label: '失败',
      detail: 'Agent Run 执行失败。'
    }
  }

  if (latestEvent.eventType === 'skill_start' || latestEvent.eventType === 'skill_progress_delta') {
    return {
      label: 'Skill 执行中',
      detail: latestEvent.name ? `正在执行 ${latestEvent.name}` : '正在执行 Skill。'
    }
  }

  if (latestEvent.eventType === 'skill_result') {
    return {
      label: 'Skill 已返回',
      detail: latestEvent.name ? `${latestEvent.name} 已返回结果。` : 'Skill 已返回结果。'
    }
  }

  if (latestEvent.eventType === 'tool_call_start' || latestEvent.eventType === 'tool_progress_delta') {
    return {
      label: 'Tool 执行中',
      detail: latestEvent.name ? `正在执行 ${latestEvent.name}` : '正在执行 Tool。'
    }
  }

  if (latestEvent.eventType === 'tool_call_result') {
    return {
      label: '模型生成最终答案',
      detail: 'Tool Result 已回填，模型正在生成最终回答。'
    }
  }

  if (latestEvent.eventType === 'model_tool_call_decision') {
    return {
      label: '模型已选择工具',
      detail: latestEvent.name ? `模型决定调用 ${latestEvent.name}` : '模型决定调用工具。'
    }
  }

  if (latestEvent.eventType === 'final_answer_delta') {
    return {
      label: '模型生成最终答案',
      detail: '正在接收最终回答。'
    }
  }

  if (latestEvent.eventType === 'model_call_start') {
    const phase = typeof latestEvent.data.phase === 'string' ? latestEvent.data.phase : ''

    if (phase === 'final_answer') {
      return {
        label: '模型生成最终答案',
        detail: '模型正在基于 Tool Result 生成最终回答。'
      }
    }

    return {
      label: '模型规划工具',
      detail: '模型正在判断是否需要调用工具。'
    }
  }

  if (latestEvent.eventType === 'model_text_delta') {
    return {
      label: '模型分析中',
      detail: '正在接收模型分析内容。'
    }
  }

  return {
    label: '运行中',
    detail: latestEvent.message || 'Agent Run 正在执行。'
  }
}
