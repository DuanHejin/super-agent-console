import { randomUUID } from 'node:crypto'

export function createTraceId() {
  return `trace_${randomUUID()}`
}

export function createRunId() {
  return `run_${randomUUID()}`
}

export function createConversationId() {
  return `conv_${randomUUID()}`
}

export function createMessageId() {
  return `msg_${randomUUID()}`
}
