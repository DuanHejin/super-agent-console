import type {
  AgentRunStatus,
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

export interface AgentRunRecord extends CreateConversationMessageResponse {
  input: string
  clientRequestId: string
  userId: string
  events: AgentEvent[]
  finalAnswer?: string
  createdAt: string
  updatedAt: string
}

interface CreateMessageRunOptions extends CreateConversationMessageRequest {
  userId?: string
}

const runs = new Map<string, AgentRunRecord>()
const idempotencyIndex = new Map<string, string>()

function getIdempotencyKey(userId: string, clientRequestId: string) {
  return `${userId}:${clientRequestId}`
}

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

export function getMessageRun(runId: string): AgentRunRecord | undefined {
  return runs.get(runId)
}

export function updateRunStatus(runId: string, status: AgentRunStatus) {
  const run = runs.get(runId)

  if (!run) {
    return undefined
  }

  run.status = transitionAgentRunStatus(run.status, status)
  run.updatedAt = new Date().toISOString()

  return run
}

export function completeMessageRun(runId: string, events: AgentEvent[], finalAnswer: string) {
  const run = runs.get(runId)

  if (!run) {
    return undefined
  }

  run.status = 'completed'
  run.events = events
  run.finalAnswer = finalAnswer
  run.updatedAt = new Date().toISOString()

  return run
}
