import type { SkillDefinition } from '../agent-config'
import { getSkillDefinition } from '../agent-config'
import { validateJsonSchema } from './schema-validator'

/** Skill 内部执行过程中向 Agent Runtime 上报的一段中间态输出。 */
export interface SkillProgressDelta {
  /** 展示给前端的增量文本。 */
  content: string
  /** 当前增量在该 Skill 过程输出中的起始位置。 */
  offset: number
  /** 可选阶段名，用于后续做更细的过程分组。 */
  stage?: string
}

/** Skill handler 执行时可使用的上下文能力。 */
interface SkillHandlerContext {
  /** 上报 Skill 执行过程中的中间态输出。 */
  emitProgress: (delta: SkillProgressDelta) => void
}

/** Skill 配置里的 handlerName 最终对应到这里的具体执行函数。 */
type SkillHandler = (input: Record<string, unknown>, context: SkillHandlerContext) => Promise<Record<string, unknown>>

/** 单次 Skill 执行后返回的标准结果。 */
export interface ExecuteSkillResult {
  /** 本次执行使用的 Skill 配置。 */
  skill: SkillDefinition
  /** 传给 handler 的已校验输入。 */
  input: Record<string, unknown>
  /** handler 返回的已校验输出。 */
  result: Record<string, unknown>
}

/** 执行 Skill 时可传入的运行期回调。 */
export interface ExecuteSkillOptions {
  /** Skill 内部产生中间态输出时触发。 */
  onProgress?: (delta: SkillProgressDelta) => void
}

/** MVP handler 注册表。后续配置后台仍可以指向这些稳定的 handlerName。 */
const skillHandlers: Record<string, SkillHandler> = {
  async extractJobRequirements(input, context) {
    const jdText = String(input.jdText ?? '')
    const lowerJdText = jdText.toLowerCase()
    const emitProgress = createSkillProgressEmitter(context.emitProgress)
    emitProgress('正在读取 JD 文本，识别岗位要求、技术关键词和职责描述。\n', 'read-input')
    emitProgress('正在匹配 Nuxt、Vue、TypeScript、SSE、K3S、Docker 等关键词。\n', 'match-keywords')

    return {
      requiredSkills: pickMatchedSkills(lowerJdText, ['Nuxt 3', 'Vue 3', 'TypeScript', 'SSE']),
      bonusSkills: pickMatchedSkills(lowerJdText, ['K3S', 'Docker', 'Agent Runtime']),
      responsibilities: ['实现 Agent 控制台', '处理流式事件', '展示工具和 Skill 执行过程'],
      riskPoints: ['需要解释清楚 AgentEvent 协议', '需要说明前端断线恢复方案']
    }
  },
  async generateSevenDayPlan(input, context) {
    const requirements = input.requirements as { requiredSkills?: string[] } | undefined
    const requiredSkills = requirements?.requiredSkills?.length
      ? requirements.requiredSkills
      : ['Nuxt 3', 'Vue 3', 'SSE']
    const emitProgress = createSkillProgressEmitter(context.emitProgress)
    emitProgress(`正在根据核心技能生成准备计划：${requiredSkills.join('、')}。\n`, 'build-plan')
    emitProgress('正在把准备内容拆成可执行的每日任务。\n', 'split-days')

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
export async function executeSkill(
  skillName: string,
  input: Record<string, unknown>,
  options: ExecuteSkillOptions = {}
): Promise<ExecuteSkillResult> {
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

  const result = await handler(input, {
    emitProgress(delta) {
      options.onProgress?.(delta)
    }
  })
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

/** 为单个 Skill 生成自增 offset，保证过程输出可以像文本流一样拼接。 */
function createSkillProgressEmitter(emitProgress: (delta: SkillProgressDelta) => void) {
  let offset = 0

  return (content: string, stage?: string) => {
    const currentOffset = offset
    offset += content.length
    const delta: SkillProgressDelta = {
      content,
      offset: currentOffset
    }

    if (stage) {
      delta.stage = stage
    }

    emitProgress(delta)
  }
}
