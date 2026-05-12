import type { AgentEvent } from '../../types/agent-event'
import type { AgentRunStatus } from '../../types/agent-run'
import { toolDefinitions } from '../agent-config'
import {
  createConversationId,
  createEventId,
  createMessageId,
  createRunId,
  createToolCallId,
  createTraceId
} from '../utils/ids'
import { createMockModelAdapter } from './model-adapters'
import { executeTool } from './tool-executor'

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
  const result = await createMockAgentRun(options)

  return result
}

/**
 * 创建 MVP Agent 事件流。
 * runtime 负责事件序号和状态表达，Tool/Skill 执行委托给 Tool Executor。
 */
export async function createMockAgentRun(options: RunMockAgentOptions): Promise<MockAgentRunResult> {
  const conversationId = options.conversationId ?? createConversationId()
  const messageId = options.messageId ?? createMessageId()
  const runId = options.runId ?? createRunId()
  const traceId = options.traceId ?? createTraceId()
  const timestamp = () => new Date().toISOString()
  let sequence = 0
  /** 为当前 run 创建一条带统一信封字段的 AgentEvent。 */
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
    '当前阶段已经可以通过 SSE 展示模型分析、Tool 调用、Skill 执行和最终答案。'
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
  const events: AgentEvent[] = []
  let finalAnswerOffset = 0
  let modelTextOffset = 0

  events.push(
    createEvent({
      eventType: 'agent_start',
      status: 'running',
      data: {
        inputPreview
      },
      message: 'Mock Agent Run started'
    })
  )
  events.push(
    createEvent({
      eventType: 'prompt_loaded',
      status: 'model_calling',
      name: 'mock-agent-default',
      data: {
        promptName: 'mock-agent-default'
      },
      message: 'Mock prompt loaded'
    })
  )
  events.push(
    createEvent({
      eventType: 'model_call_start',
      status: 'model_calling',
      name: 'mock-model',
      data: {
        model: 'mock-model'
      },
      message: 'Mock model call started'
    })
  )

  for (const content of modelAnalysisChunks) {
    const currentOffset = modelTextOffset
    modelTextOffset += content.length

    events.push(
      createEvent({
        eventType: 'model_text_delta',
        status: 'model_calling',
        name: 'mock-model',
        data: {
          content,
          offset: currentOffset
        },
        message: 'Mock model analysis delta'
      })
    )
  }

  const model = createMockModelAdapter()
  const modelResponse = await model.complete({
    messages: [
      {
        role: 'user',
        content: normalizedInput
      }
    ],
    tools: toolDefinitions
  })
  const toolCall = modelResponse.toolCalls?.[0] ?? {
    id: createToolCallId(),
    name: 'analyzeJobAndGeneratePlan',
    arguments: {
      jdText: normalizedInput
    }
  }
  const toolCallId = toolCall.id

  events.push(
    createEvent({
      eventType: 'tool_call_start',
      status: 'tool_calling',
      name: toolCall.name,
      data: {
        toolCallId,
        toolName: toolCall.name,
        args: toolCall.arguments
      },
      message: 'Mock tool call started'
    })
  )

  const toolExecution = await executeTool({
    name: toolCall.name,
    args: toolCall.arguments,
    onToolProgress(delta) {
      events.push(
        createEvent({
          eventType: 'tool_progress_delta',
          status: 'tool_calling',
          name: toolCall.name,
          data: {
            toolCallId,
            toolName: toolCall.name,
            content: delta.content,
            offset: delta.offset,
            stage: delta.stage
          },
          message: 'Mock tool progress delta'
        })
      )
    },
    onSkillStart(skillExecution) {
      events.push(
        createEvent({
          eventType: 'skill_start',
          status: 'skill_running',
          name: skillExecution.skillName,
          data: {
            toolCallId,
            skillRunId: skillExecution.skillRunId,
            skillName: skillExecution.skillName,
            input: skillExecution.input
          },
          message: 'Mock skill started'
        })
      )
    },
    onSkillProgress(skillExecution, delta) {
      events.push(
        createEvent({
          eventType: 'skill_progress_delta',
          status: 'skill_running',
          name: skillExecution.skillName,
          data: {
            toolCallId,
            skillRunId: skillExecution.skillRunId,
            skillName: skillExecution.skillName,
            content: delta.content,
            offset: delta.offset,
            stage: delta.stage
          },
          message: 'Mock skill progress delta'
        })
      )
    },
    onSkillResult(skillExecution) {
      events.push(
        createEvent({
          eventType: 'skill_result',
          status: 'skill_running',
          name: skillExecution.skillName,
          data: {
            toolCallId,
            skillRunId: skillExecution.skillRunId,
            skillName: skillExecution.skillName,
            result: skillExecution.result
          },
          message: 'Mock skill finished'
        })
      )
    }
  })

  events.push(
    createEvent({
      eventType: 'tool_call_result',
      status: 'tool_calling',
      name: toolExecution.tool.name,
      data: {
        toolCallId,
        toolName: toolExecution.tool.name,
        result: toolExecution.result
      },
      message: 'Mock tool call finished'
    })
  )

  for (const content of finalAnswerChunks) {
    const currentOffset = finalAnswerOffset
    finalAnswerOffset += content.length

    events.push(
      createEvent({
        eventType: 'final_answer_delta',
        status: 'generating',
        data: {
          content,
          offset: currentOffset
        },
        message: 'Mock final answer delta'
      })
    )
  }

  events.push(
    createEvent({
      eventType: 'agent_done',
      status: 'completed',
      data: {
        resultId: `result_${runId}`
      },
      message: 'Mock Agent Run finished'
    })
  )

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
