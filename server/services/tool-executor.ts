import type { ToolDefinition } from '../agent-config'
import { getToolWorkflowByToolName } from '../agent-config/workflows'
import { createSkillRunId } from '../utils/ids'
import { executeSkill } from './skill-executor'
import { validateJsonSchema } from './schema-validator'
import { getToolDefinition } from './tool-registry'
import { resolveWorkflowInput } from './workflow-input-mapping'

/** Tool workflow 运行过程中产生的一条 Skill 执行记录。 */
export interface ToolSkillExecution {
  /** 配置中的 workflow step id。 */
  stepId: string
  /** 本次 Skill 执行的运行时 id。 */
  skillRunId: string
  /** Skill 配置名。 */
  skillName: string
  /** 经过 workflow inputMapping 解析后的 Skill 输入。 */
  input: Record<string, unknown>
  /** Skill 执行并通过输出 schema 校验后的结果。 */
  result: Record<string, unknown>
}

/** 返回给 Agent Runtime 的标准 Tool 执行结果。 */
export interface ToolExecutionResult {
  /** 本次执行使用的 Tool 配置。 */
  tool: ToolDefinition
  /** 已校验的 Tool 参数。 */
  args: Record<string, unknown>
  /** 本次编排使用的 workflow 配置名。 */
  workflowName: string
  /** 有序 Skill 执行记录。 */
  steps: ToolSkillExecution[]
  /** 返回给 runtime/model 的 Tool 级结果负载。 */
  result: Record<string, unknown>
}

/** 执行一次模型请求的 Tool call 所需参数。 */
export interface ExecuteToolOptions {
  /** 模型返回的 Tool 名称。 */
  name: string
  /** 模型返回的 Tool 参数。 */
  args: Record<string, unknown>
  /** 执行 Skill 前给 Agent Runtime 的回调，用于推送 `skill_start`。 */
  onSkillStart?: (execution: Omit<ToolSkillExecution, 'result'>) => void
  /** Skill 执行后给 Agent Runtime 的回调，用于推送 `skill_result`。 */
  onSkillResult?: (execution: ToolSkillExecution) => void
}

/**
 * 按配置 workflow 执行一次 Tool call。
 * 这是 Tool Router 边界：负责 Tool 白名单、参数 schema、
 * workflow 查找、Skill 输入映射，以及有序执行 Skill。
 */
export async function executeTool(options: ExecuteToolOptions): Promise<ToolExecutionResult> {
  const { name, args } = options
  const tool = getToolDefinition(name)
  const workflow = getToolWorkflowByToolName(name)

  if (!tool || !tool.enabled) {
    throw new Error(`Tool ${name} is not enabled.`)
  }

  const toolArgsValidation = validateJsonSchema(tool.parameters, args, `tool.${name}.args`)

  if (!toolArgsValidation.valid) {
    throw new Error(`Invalid Tool arguments: ${toolArgsValidation.errors.join('; ')}`)
  }

  if (!workflow) {
    throw new Error(`Workflow for Tool ${name} is not defined.`)
  }

  const steps: ToolSkillExecution[] = []
  const stepOutputs: Record<string, unknown> = {}

  for (const step of workflow.steps) {
    const input = resolveWorkflowInput({
      inputMapping: step.inputMapping,
      toolArgs: args,
      stepOutputs
    })
    const skillRunId = createSkillRunId()
    const skillStartExecution = {
      stepId: step.id,
      skillRunId,
      skillName: step.skillName,
      input
    }

    options.onSkillStart?.(skillStartExecution)

    const skillResult = await executeSkill(step.skillName, input)
    const execution = {
      ...skillStartExecution,
      result: skillResult.result
    }

    stepOutputs[step.id] = {
      output: skillResult.result,
      result: skillResult.result
    }
    steps.push(execution)
    options.onSkillResult?.(execution)
  }

  return {
    tool,
    args,
    workflowName: workflow.name,
    steps,
    result: {
      workflowName: workflow.name,
      steps: steps.map((step) => ({
        stepId: step.stepId,
        skillName: step.skillName,
        result: step.result
      })),
      output: steps[steps.length - 1]?.result ?? {}
    }
  }
}
