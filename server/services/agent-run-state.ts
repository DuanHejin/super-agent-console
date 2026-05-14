import type { AgentRunStatus } from '../../types/agent-run'

/** 单次 Agent Run 在 MVP 阶段允许的状态流转。 */
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

/** 判断 run 是否可以从当前状态流转到目标状态。 */
export function canTransitionAgentRunStatus(current: AgentRunStatus, next: AgentRunStatus) {
  return current === next || allowedTransitions[current].includes(next)
}

/** 强制校验 Agent Run 状态流转，事件顺序异常时尽早失败。 */
export function transitionAgentRunStatus(current: AgentRunStatus, next: AgentRunStatus) {
  if (!canTransitionAgentRunStatus(current, next)) {
    throw new Error(`Invalid Agent Run status transition: ${current} -> ${next}`)
  }

  return next
}
