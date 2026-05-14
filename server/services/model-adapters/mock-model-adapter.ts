import type { ModelAdapter, ModelRequest, ModelResponse, ModelStreamEvent } from '../../agent-config'

export function createMockModelAdapter(): ModelAdapter {
  const complete = async (request: ModelRequest): Promise<ModelResponse> => {
    const userMessage = [...request.messages].reverse().find((message) => message.role === 'user')
    const input = userMessage?.content?.trim() || '未提供输入'
    const firstTool = request.tools?.find((tool) => tool.enabled)
    const skillResult = createMockSkillResult(input)

    if (skillResult) {
      return {
        content: JSON.stringify(skillResult)
      }
    }

    return {
      content: `Mock model received: ${input.slice(0, 80)}`,
      toolCalls: firstTool
        ? [
            {
              id: 'tool_call_mock_analyze_jd',
              name: firstTool.name,
              arguments: {
                jdText: input
              }
            }
          ]
        : undefined
    }
  }

  return {
    provider: 'mock',
    complete,
    async *stream(request: ModelRequest): AsyncIterable<ModelStreamEvent> {
      const response = await complete(request)

      if (response.toolCalls?.length) {
        for (const toolCall of response.toolCalls) {
          yield {
            type: 'tool_call',
            toolCall
          }
        }
      }

      yield {
        type: 'text_delta',
        content: response.content
      }
      yield {
        type: 'done'
      }
    }
  }
}

function createMockSkillResult(input: string) {
  try {
    const payload = JSON.parse(input) as { skillName?: string }

    if (payload.skillName === 'extractJobRequirementsSkill') {
      return {
        requiredSkills: ['Vue 3', 'TypeScript', 'Nuxt 3', 'SSE'],
        bonusSkills: ['Docker', 'K3S', 'Agent Runtime'],
        responsibilities: ['拆解岗位要求', '设计 Agent 执行链路', '展示流式执行过程'],
        riskPoints: ['需要讲清楚 Tool / Skill 编排', '需要说明 SSE 断线和重连策略']
      }
    }

    if (payload.skillName === 'generateSevenDayPlanSkill') {
      return {
        days: [
          {
            day: 1,
            focus: '岗位要求拆解',
            tasks: ['整理 JD 关键词', '匹配过往项目经历']
          },
          {
            day: 2,
            focus: '核心技术复盘',
            tasks: ['复盘 Vue 3 / Nuxt 3', '准备 TypeScript 和 SSE 高频问题']
          },
          {
            day: 3,
            focus: '项目表达准备',
            tasks: ['梳理 Agent Runtime 链路', '准备 Tool / Skill 编排说明']
          }
        ]
      }
    }
  } catch {
    return undefined
  }

  return undefined
}
