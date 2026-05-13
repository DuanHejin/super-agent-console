import type { AgentEvent } from './agent-event'

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

/** Run 详情页 / 查询接口使用的响应结构。 */
export interface AgentRunDetailResponse {
  conversationId: string
  messageId: string
  runId: string
  traceId: string
  status: AgentRunStatus
  input: string
  events: AgentEvent[]
  finalAnswer?: string
  createdAt: string
  updatedAt: string
}

/** Conversation 列表页展示的一条会话摘要。 */
export interface ConversationListItem {
  conversationId: string
  title?: string
  messageCount: number
  runCount: number
  latestRunId?: string
  latestRunStatus?: AgentRunStatus
  createdAt: string
  updatedAt: string
}

/** Run 列表页展示的一条运行摘要。 */
export interface AgentRunListItem {
  conversationId: string
  messageId: string
  runId: string
  traceId: string
  status: AgentRunStatus
  inputPreview: string
  finalAnswerPreview?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}
