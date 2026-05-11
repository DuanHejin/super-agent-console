export type AgentEventType =
  | 'run_started'
  | 'prompt_loaded'
  | 'model_stream_started'
  | 'tool_call_started'
  | 'tool_call_finished'
  | 'model_delta'
  | 'run_finished'
  | 'run_failed'

interface AgentEventBase<T extends AgentEventType> {
  eventType: T
  conversationId?: string
  messageId?: string
  runId: string
  traceId: string
  sequence: number
  status?: string
  timestamp: string
  message?: string
}

export type AgentEvent =
  | AgentEventBase<'run_started'>
  | (AgentEventBase<'prompt_loaded'> & {
      promptName: string
    })
  | (AgentEventBase<'model_stream_started'> & {
      model: string
    })
  | (AgentEventBase<'tool_call_started'> & {
      toolCallId: string
      toolName: string
      args: unknown
    })
  | (AgentEventBase<'tool_call_finished'> & {
      toolCallId: string
      toolName: string
      result: unknown
    })
  | (AgentEventBase<'model_delta'> & {
      content: string
    })
  | (AgentEventBase<'run_finished'> & {
      resultId?: string
    })
  | (AgentEventBase<'run_failed'> & {
      errorMessage: string
    })
