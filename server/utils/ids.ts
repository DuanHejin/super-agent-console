import { randomUUID } from 'node:crypto'

export function createTraceId() {
  return `trace_${randomUUID()}`
}

export function createRunId() {
  return `run_${randomUUID()}`
}
