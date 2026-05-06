export type AgentEvent =
  | {
      type: 'agent_start'
      runId: string
      traceId: string
      timestamp: string
    }
  | {
      type: 'prompt_loaded'
      runId: string
      traceId: string
      promptName: string
      timestamp: string
    }
  | {
      type: 'model_stream_start'
      runId: string
      traceId: string
      model: string
      timestamp: string
    }
  | {
      type: 'tool_call_start'
      runId: string
      traceId: string
      toolCallId: string
      toolName: string
      args: unknown
      timestamp: string
    }
  | {
      type: 'tool_call_result'
      runId: string
      traceId: string
      toolCallId: string
      toolName: string
      result: unknown
      timestamp: string
    }
  | {
      type: 'final_answer_delta'
      runId: string
      traceId: string
      content: string
      timestamp: string
    }
  | {
      type: 'agent_done'
      runId: string
      traceId: string
      resultId?: string
      timestamp: string
    }
  | {
      type: 'agent_error'
      runId: string
      traceId: string
      error: string
      timestamp: string
    }
