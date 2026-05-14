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

export function createEventId() {
  return `evt_${randomUUID()}`
}

export function createToolCallId() {
  return `tool_call_${randomUUID()}`
}

export function createSkillRunId() {
  return `skill_run_${randomUUID()}`
}

export function createFeedbackId() {
  return `feedback_${randomUUID()}`
}
