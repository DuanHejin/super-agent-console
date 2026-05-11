/** 单次 Agent Run 的当前生命周期状态。 */
export type AgentRunStatus =
  | 'created'
  | 'running'
  | 'model_calling'
  | 'tool_calling'
  | 'skill_running'
  | 'generating'
  | 'completed'
  | 'failed'

/** 创建用户消息和 Agent Run 的请求体。 */
export interface CreateConversationMessageRequest {
  /** 已存在的会话 id。首轮对话可以不传。 */
  conversationId?: string
  /** 用户输入内容，会作为用户消息保存。 */
  input: string
  /** 前端为本次发送动作生成的幂等 key。 */
  clientRequestId: string
}

/** 创建 run 或通过幂等 key 命中已有 run 后返回的响应。 */
export interface CreateConversationMessageResponse {
  conversationId: string
  messageId: string
  runId: string
  traceId: string
  status: AgentRunStatus
  /** 为 true 时表示本次请求命中了相同 clientRequestId 对应的已有 run。 */
  idempotent: boolean
}
