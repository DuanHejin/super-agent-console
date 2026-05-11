import type { AgentEvent } from '../../types/agent-event'
import type { AgentRunStatus } from '../../types/agent-run'
import {
  createConversationId,
  createEventId,
  createMessageId,
  createRunId,
  createSkillRunId,
  createToolCallId,
  createTraceId
} from '../utils/ids'

export interface MockAgentRunResult {
  runId: string
  traceId: string
  events: AgentEvent[]
  finalAnswer: string
}

interface RunMockAgentOptions {
  input: string
  conversationId?: string
  messageId?: string
  runId?: string
  traceId?: string
}

export async function runMockAgent(options: RunMockAgentOptions): Promise<MockAgentRunResult> {
  const result = createMockAgentRun(options)

  return result
}

export function createMockAgentRun(options: RunMockAgentOptions): MockAgentRunResult {
  const conversationId = options.conversationId ?? createConversationId()
  const messageId = options.messageId ?? createMessageId()
  const runId = options.runId ?? createRunId()
  const traceId = options.traceId ?? createTraceId()
  const timestamp = () => new Date().toISOString()
  let sequence = 0
  const createEvent = <TData extends Record<string, unknown>>(event: {
    eventType: AgentEvent['eventType']
    status: AgentRunStatus
    name?: string
    data: TData
    message?: string
  }): AgentEvent<TData> => {
    sequence += 1

    return {
      eventId: createEventId(),
      eventType: event.eventType,
      conversationId,
      messageId,
      runId,
      traceId,
      sequence,
      status: event.status,
      timestamp: timestamp(),
      name: event.name,
      data: event.data,
      message: event.message
    }
  }
  const normalizedInput = options.input.trim()
  const inputPreview = normalizedInput.slice(0, 80) || '未提供输入'
  const finalAnswer = [
    `已收到输入：${inputPreview}`,
    '这是一次 Mock Agent Run，用于验证前端输入、服务端编排、Timeline 展示和运行元信息。',
    '下一阶段会把这条链路改造成 SSE 流式事件。'
  ].join('\n')
  const finalAnswerChunks = [
    `已收到输入：${inputPreview}\n`,
    '这是一次 Mock Agent Run，用于验证前端输入、服务端编排、Timeline 展示和运行元信息。\n',
    '当前阶段已经通过 SSE 逐步推送事件。'
  ]
  const modelAnalysisChunks = [
    '正在阅读用户输入，判断这是否属于岗位分析和面试准备任务。\n',
    '输入中包含可提取的岗位要求，需要调用工具完成结构化拆解。\n',
    '工具返回后，再根据 Skill 输出生成最终准备建议。\n'
  ]
  const extractedRequirements = {
    requiredSkills: ['Nuxt 3', 'Vue 3', 'SSE', 'TypeScript'],
    bonusSkills: ['K3S', 'Docker', 'Agent Runtime'],
    responsibilities: ['实现 Agent 控制台', '处理流式事件', '展示工具和 Skill 执行过程'],
    riskPoints: ['需要解释清楚 AgentEvent 协议', '需要说明前端断线恢复方案']
  }
  const sevenDayPlan = {
    days: [
      {
        day: 1,
        focus: '梳理岗位要求',
        tasks: ['提取 JD 关键词', '整理项目亮点']
      },
      {
        day: 2,
        focus: '复盘 Nuxt 与 SSE',
        tasks: ['讲清楚双接口链路', '准备 SSE 异常处理案例']
      }
    ]
  }
  const toolCallId = createToolCallId()
  const extractSkillRunId = createSkillRunId()
  const planSkillRunId = createSkillRunId()
  let finalAnswerOffset = 0
  let modelTextOffset = 0

  const events: AgentEvent[] = [
    createEvent({
      eventType: 'agent_start',
      status: 'running',
      data: {
        inputPreview
      },
      message: 'Mock Agent Run started'
    }),
    createEvent({
      eventType: 'prompt_loaded',
      status: 'model_calling',
      name: 'mock-agent-default',
      data: {
        promptName: 'mock-agent-default'
      },
      message: 'Mock prompt loaded'
    }),
    createEvent({
      eventType: 'model_call_start',
      status: 'model_calling',
      name: 'mock-model',
      data: {
        model: 'mock-model'
      },
      message: 'Mock model call started'
    }),
    ...modelAnalysisChunks.map((content) => {
      const currentOffset = modelTextOffset
      modelTextOffset += content.length

      return createEvent({
        eventType: 'model_text_delta',
        status: 'model_calling',
        name: 'mock-model',
        data: {
          content,
          offset: currentOffset
        },
        message: 'Mock model analysis delta'
      })
    }),
    createEvent({
      eventType: 'tool_call_start',
      status: 'tool_calling',
      name: 'analyzeJobAndGeneratePlan',
      data: {
        toolCallId,
        toolName: 'analyzeJobAndGeneratePlan',
        args: {
          jdText: normalizedInput,
          candidateProfile: null
        }
      },
      message: 'Mock tool call started'
    }),
    createEvent({
      eventType: 'skill_start',
      status: 'skill_running',
      name: 'extractJobRequirementsSkill',
      data: {
        toolCallId,
        skillRunId: extractSkillRunId,
        skillName: 'extractJobRequirementsSkill',
        input: {
          jdText: normalizedInput,
          candidateProfile: null
        }
      },
      message: 'Mock skill started'
    }),
    createEvent({
      eventType: 'skill_result',
      status: 'skill_running',
      name: 'extractJobRequirementsSkill',
      data: {
        toolCallId,
        skillRunId: extractSkillRunId,
        skillName: 'extractJobRequirementsSkill',
        result: extractedRequirements
      },
      message: 'Mock skill finished'
    }),
    createEvent({
      eventType: 'skill_start',
      status: 'skill_running',
      name: 'generateSevenDayPlanSkill',
      data: {
        toolCallId,
        skillRunId: planSkillRunId,
        skillName: 'generateSevenDayPlanSkill',
        input: {
          requirements: extractedRequirements,
          candidateProfile: null
        }
      },
      message: 'Mock skill started'
    }),
    createEvent({
      eventType: 'skill_result',
      status: 'skill_running',
      name: 'generateSevenDayPlanSkill',
      data: {
        toolCallId,
        skillRunId: planSkillRunId,
        skillName: 'generateSevenDayPlanSkill',
        result: sevenDayPlan
      },
      message: 'Mock skill finished'
    }),
    createEvent({
      eventType: 'tool_call_result',
      status: 'tool_calling',
      name: 'analyzeJobAndGeneratePlan',
      data: {
        toolCallId,
        toolName: 'analyzeJobAndGeneratePlan',
        result: {
          requirements: extractedRequirements,
          plan: sevenDayPlan
        }
      },
      message: 'Mock tool call finished'
    }),
    ...finalAnswerChunks.map((content) => {
      const currentOffset = finalAnswerOffset
      finalAnswerOffset += content.length

      return createEvent({
        eventType: 'final_answer_delta',
        status: 'generating',
        data: {
          content,
          offset: currentOffset
        },
        message: 'Mock final answer delta'
      })
    }),
    createEvent({
      eventType: 'agent_done',
      status: 'completed',
      data: {
        resultId: `result_${runId}`
      },
      message: 'Mock Agent Run finished'
    })
  ]

  return {
    runId,
    traceId,
    events,
    finalAnswer
  }
}

export async function runRealAgent() {
  throw new Error('runRealAgent is not implemented yet')
}
