import type { AgentRunStatus } from './agent-run'

export type AgentEventType =
  | 'agent_start'
  | 'prompt_loaded'
  | 'model_call_start'
  | 'model_text_delta'
  | 'tool_call_start'
  | 'skill_start'
  | 'skill_result'
  | 'tool_call_result'
  | 'final_answer_delta'
  | 'agent_done'
  | 'agent_error'

export interface AgentEvent<TData = Record<string, unknown>> {
  eventId: string
  eventType: AgentEventType
  conversationId: string
  messageId: string
  runId: string
  traceId: string
  sequence: number
  status: AgentRunStatus
  timestamp: string
  name?: string
  data: TData
  message?: string
}
