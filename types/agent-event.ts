import type { AgentRunStatus } from './agent-run'

/** Agent Runtime 可以流式推送给前端 Timeline 的事件类型。 */
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

/** SSE、日志、未来数据库记录和 replay 共同使用的统一事件信封。 */
export interface AgentEvent<TData = Record<string, unknown>> {
  /** 当前事件唯一 id，后续可用于数据库落库和 replay 去重。 */
  eventId: string
  /** 当前发生了什么事件。注意和 `status` 区分开。 */
  eventType: AgentEventType
  /** 当前 run 所属的会话。 */
  conversationId: string
  /** 触发当前 run 的用户消息。 */
  messageId: string
  /** Agent 本次执行 id。 */
  runId: string
  /** 链路追踪 id，贯穿日志和事件，方便观测与排查。 */
  traceId: string
  /** 当前 run 内单调递增的事件序号。 */
  sequence: number
  /** 当前事件发生后，run 所处的状态。 */
  status: AgentRunStatus
  /** 运行时生成的 ISO 时间戳。 */
  timestamp: string
  /** 可选展示名/调试名，例如模型名、Tool 名、Skill 名。 */
  name?: string
  /** 当前事件的业务负载，Tool/Skill 输入输出和文本 delta 都放这里。 */
  data: TData
  /** 给 Timeline 或日志展示的简短说明。 */
  message?: string
}
