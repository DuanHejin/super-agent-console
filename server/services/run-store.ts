import type {
  AgentRunStatus,
  AgentRunListItem,
  ConversationListItem,
  AgentRunDetailResponse,
  CreateConversationMessageRequest,
  CreateConversationMessageResponse
} from '../../types/agent-run'
import type { AgentEvent } from '../../types/agent-event'
import {
  createConversationId,
  createMessageId,
  createRunId,
  createTraceId
} from '../utils/ids'
import { transitionAgentRunStatus } from './agent-run-state'

/** 单次 Agent Run 的 MVP 内存记录。后续会替换为 Prisma/Redis。 */
export interface AgentRunRecord extends CreateConversationMessageResponse {
  /** 触发当前 run 的用户输入。 */
  input: string
  /** 创建 run 时使用的前端幂等 key。 */
  clientRequestId: string
  /** MVP 阶段用于限定幂等范围的占位用户 id。 */
  userId: string
  /** runtime 生成的事件。MVP 阶段在完成后写入内存记录。 */
  events: AgentEvent[]
  finalAnswer?: string
  createdAt: string
  updatedAt: string
}

/** 内部创建参数，允许传入 userId 作为幂等范围。 */
interface CreateMessageRunOptions extends CreateConversationMessageRequest {
  userId?: string
}

const runs = new Map<string, AgentRunRecord>()
const idempotencyIndex = new Map<string, string>()

function getIdempotencyKey(userId: string, clientRequestId: string) {
  return `${userId}:${clientRequestId}`
}

/**
 * 创建 conversation message 和 Agent Run。
 * 如果相同 user/clientRequestId 已经处理过，则直接返回已有 run。
 */
export function createMessageRun(options: CreateMessageRunOptions): CreateConversationMessageResponse {
  const userId = options.userId ?? 'demo-user'
  const normalizedInput = options.input.trim()
  const normalizedClientRequestId = options.clientRequestId.trim()
  const idempotencyKey = getIdempotencyKey(userId, normalizedClientRequestId)
  const existingRunId = idempotencyIndex.get(idempotencyKey)

  if (existingRunId) {
    const existingRun = runs.get(existingRunId)

    if (existingRun) {
      return {
        conversationId: existingRun.conversationId,
        messageId: existingRun.messageId,
        runId: existingRun.runId,
        traceId: existingRun.traceId,
        status: existingRun.status,
        idempotent: true
      }
    }
  }

  const now = new Date().toISOString()
  const run: AgentRunRecord = {
    conversationId: options.conversationId?.trim() || createConversationId(),
    messageId: createMessageId(),
    runId: createRunId(),
    traceId: createTraceId(),
    status: 'created',
    idempotent: false,
    input: normalizedInput,
    clientRequestId: normalizedClientRequestId,
    userId,
    events: [],
    createdAt: now,
    updatedAt: now
  }

  runs.set(run.runId, run)
  idempotencyIndex.set(idempotencyKey, run.runId)

  return {
    conversationId: run.conversationId,
    messageId: run.messageId,
    runId: run.runId,
    traceId: run.traceId,
    status: run.status,
    idempotent: false
  }
}

/** 从 MVP 内存存储中查询 run。 */
export function getMessageRun(runId: string): AgentRunRecord | undefined {
  return runs.get(runId)
}

/** 将内部 run 记录转换为可返回给前端的详情结构。 */
export function toRunDetailResponse(run: AgentRunRecord): AgentRunDetailResponse {
  return {
    conversationId: run.conversationId,
    messageId: run.messageId,
    runId: run.runId,
    traceId: run.traceId,
    status: run.status,
    input: run.input,
    events: run.events,
    finalAnswer: run.finalAnswer,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt
  }
}

/** 通过状态机守卫更新 run 状态。 */
export function updateRunStatus(runId: string, status: AgentRunStatus) {
  const run = runs.get(runId)

  if (!run) {
    return undefined
  }

  run.status = transitionAgentRunStatus(run.status, status)
  run.updatedAt = new Date().toISOString()

  return run
}

/** 追加一条运行时事件，供详情页和未来 replay 查询。 */
export function appendRunEvent(runId: string, event: AgentEvent) {
  const run = runs.get(runId)

  if (!run) {
    return undefined
  }

  run.events.push(event)
  run.updatedAt = new Date().toISOString()

  return run
}

/** SSE 流结束后，把最终事件和输出写入 MVP 内存存储。 */
export function completeMessageRun(runId: string, events: AgentEvent[], finalAnswer: string) {
  const run = runs.get(runId)

  if (!run) {
    return undefined
  }

  run.status = 'completed'
  run.events = events.length >= run.events.length ? events : run.events
  run.finalAnswer = finalAnswer
  run.updatedAt = new Date().toISOString()

  return run
}

/** 内存 fallback：列出最近的 Agent Run。 */
export function listMessageRuns(limit = 50): AgentRunListItem[] {
  return Array.from(runs.values())
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit)
    .map((run) => ({
      conversationId: run.conversationId,
      messageId: run.messageId,
      runId: run.runId,
      traceId: run.traceId,
      status: run.status,
      inputPreview: run.input.slice(0, 120),
      finalAnswerPreview: run.finalAnswer?.slice(0, 120),
      createdAt: run.createdAt,
      updatedAt: run.updatedAt
    }))
}

/** 内存 fallback：按 conversationId 聚合会话摘要。 */
export function listConversations(limit = 50): ConversationListItem[] {
  const conversations = new Map<string, ConversationListItem>()

  for (const run of runs.values()) {
    const existing = conversations.get(run.conversationId)

    if (!existing) {
      conversations.set(run.conversationId, {
        conversationId: run.conversationId,
        title: run.input.slice(0, 80) || '新会话',
        messageCount: 1,
        runCount: 1,
        latestRunId: run.runId,
        latestRunStatus: run.status,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt
      })
      continue
    }

    existing.messageCount += 1
    existing.runCount += 1

    if (run.updatedAt > existing.updatedAt) {
      existing.latestRunId = run.runId
      existing.latestRunStatus = run.status
      existing.updatedAt = run.updatedAt
    }
  }

  return Array.from(conversations.values())
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit)
}
