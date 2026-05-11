export type AgentRunStatus =
  | 'created'
  | 'running'
  | 'model_calling'
  | 'tool_calling'
  | 'skill_running'
  | 'generating'
  | 'completed'
  | 'failed'

export interface CreateConversationMessageRequest {
  conversationId?: string
  input: string
  clientRequestId: string
}

export interface CreateConversationMessageResponse {
  conversationId: string
  messageId: string
  runId: string
  traceId: string
  status: AgentRunStatus
  idempotent: boolean
}
