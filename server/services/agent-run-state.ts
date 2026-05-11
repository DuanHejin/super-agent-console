import type { AgentRunStatus } from '../../types/agent-run'

const allowedTransitions: Record<AgentRunStatus, AgentRunStatus[]> = {
  created: ['running', 'failed'],
  running: ['model_calling', 'tool_calling', 'skill_running', 'generating', 'completed', 'failed'],
  model_calling: ['tool_calling', 'generating', 'completed', 'failed'],
  tool_calling: ['skill_running', 'model_calling', 'generating', 'completed', 'failed'],
  skill_running: ['tool_calling', 'failed'],
  generating: ['completed', 'failed'],
  completed: [],
  failed: []
}

export function canTransitionAgentRunStatus(current: AgentRunStatus, next: AgentRunStatus) {
  return current === next || allowedTransitions[current].includes(next)
}

export function transitionAgentRunStatus(current: AgentRunStatus, next: AgentRunStatus) {
  if (!canTransitionAgentRunStatus(current, next)) {
    throw new Error(`Invalid Agent Run status transition: ${current} -> ${next}`)
  }

  return next
}
