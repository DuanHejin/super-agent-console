import type { SkillDefinition } from '../agent-config'
import { getSkillDefinition } from '../agent-config'
import { validateJsonSchema } from './schema-validator'

/** Skill 配置里的 handlerName 最终对应到这里的具体执行函数。 */
type SkillHandler = (input: Record<string, unknown>) => Promise<Record<string, unknown>>

/** 单次 Skill 执行后返回的标准结果。 */
export interface ExecuteSkillResult {
  /** 本次执行使用的 Skill 配置。 */
  skill: SkillDefinition
  /** 传给 handler 的已校验输入。 */
  input: Record<string, unknown>
  /** handler 返回的已校验输出。 */
  result: Record<string, unknown>
}

/** MVP handler 注册表。后续配置后台仍可以指向这些稳定的 handlerName。 */
const skillHandlers: Record<string, SkillHandler> = {
  async extractJobRequirements(input) {
    const jdText = String(input.jdText ?? '')
    const lowerJdText = jdText.toLowerCase()

    return {
      requiredSkills: pickMatchedSkills(lowerJdText, ['Nuxt 3', 'Vue 3', 'TypeScript', 'SSE']),
      bonusSkills: pickMatchedSkills(lowerJdText, ['K3S', 'Docker', 'Agent Runtime']),
      responsibilities: ['实现 Agent 控制台', '处理流式事件', '展示工具和 Skill 执行过程'],
      riskPoints: ['需要解释清楚 AgentEvent 协议', '需要说明前端断线恢复方案']
    }
  },
  async generateSevenDayPlan(input) {
    const requirements = input.requirements as { requiredSkills?: string[] } | undefined
    const requiredSkills = requirements?.requiredSkills?.length
      ? requirements.requiredSkills
      : ['Nuxt 3', 'Vue 3', 'SSE']

    return {
      days: [
        {
          day: 1,
          focus: '梳理岗位要求',
          tasks: ['提取 JD 关键词', `确认核心技能：${requiredSkills.join('、')}`]
        },
        {
          day: 2,
          focus: '复盘 Nuxt 与 SSE',
          tasks: ['讲清楚双接口链路', '准备 SSE 异常处理案例']
        }
      ]
    }
  }
}

/**
 * 根据 Skill 配置名执行一个 Skill。
 * 执行器会先校验输入，再解析 handlerName 并执行 handler，
 * 最后校验输出，再把结果交还给 Tool workflow 编排层。
 */
export async function executeSkill(skillName: string, input: Record<string, unknown>): Promise<ExecuteSkillResult> {
  const skill = getSkillDefinition(skillName)

  if (!skill) {
    throw new Error(`Skill ${skillName} is not defined.`)
  }

  const inputValidation = validateJsonSchema(skill.inputSchema, input, `skill.${skillName}.input`)

  if (!inputValidation.valid) {
    throw new Error(`Invalid Skill input: ${inputValidation.errors.join('; ')}`)
  }

  const handler = skillHandlers[skill.execution.handlerName]

  if (!handler) {
    throw new Error(`Skill handler ${skill.execution.handlerName} is not implemented.`)
  }

  const result = await handler(input)
  const outputValidation = validateJsonSchema(skill.outputSchema, result, `skill.${skillName}.output`)

  if (!outputValidation.valid) {
    throw new Error(`Invalid Skill output: ${outputValidation.errors.join('; ')}`)
  }

  return {
    skill,
    input,
    result
  }
}

/** Mock JD 提取 Skill 使用的简单确定性匹配函数。 */
function pickMatchedSkills(text: string, candidates: string[]) {
  const matched = candidates.filter((skill) => text.includes(skill.toLowerCase()))

  return matched.length ? matched : candidates
}
