import type { AgentEvent } from '../../types/agent-event'
import type { AgentRunStatus } from '../../types/agent-run'
import type { ModelMessage, ModelToolCall } from '../agent-config'
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
import { createModelAdapter } from './model-adapters/registry'
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

export interface RunRealAgentOptions extends RunMockAgentOptions {
  modelProvider: 'volcengine_ark'
  modelName: string
  modelBaseUrl: string
  modelApiKey?: string
  temperature: number
  topP: number
  maxTokens: number
}

export interface AgentRunEventStream {
  provider: string
  modelName: string
  events: AsyncIterable<AgentEvent>
  getFinalAnswer(): string
}

const realAgentTools = toolDefinitions.filter((tool) => tool.name === 'analyzeJobAndGeneratePlan')

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
            stepId: skillExecution.stepId,
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
            stepId: skillExecution.stepId,
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
            stepId: skillExecution.stepId,
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

/** 创建真实模型 Agent 事件流，支持模型 tool call、Tool/Skill 执行和 Tool Result 回填。 */
export function createRealAgentRunStream(options: RunRealAgentOptions): AgentRunEventStream {
  const conversationId = options.conversationId ?? createConversationId()
  const messageId = options.messageId ?? createMessageId()
  const runId = options.runId ?? createRunId()
  const traceId = options.traceId ?? createTraceId()
  const timestamp = () => new Date().toISOString()
  let sequence = 0
  let finalAnswer = ''
  let finalAnswerOffset = 0
  let modelTextOffset = 0
  const normalizedInput = options.input.trim()
  const inputPreview = normalizedInput.slice(0, 80) || '未提供输入'
  const model = createModelAdapter({
    provider: options.modelProvider,
    apiKey: options.modelApiKey,
    baseUrl: options.modelBaseUrl,
    modelId: options.modelName
  })

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

  async function* events(): AsyncIterable<AgentEvent> {
    try {
      yield createEvent({
        eventType: 'agent_start',
        status: 'running',
        data: {
          inputPreview
        },
        message: 'Real Agent Run started'
      })

      yield createEvent({
        eventType: 'prompt_loaded',
        status: 'model_calling',
        name: 'real-agent-default',
        data: {
          promptName: 'real-agent-default'
        },
        message: 'Real prompt loaded'
      })

      yield createEvent({
        eventType: 'model_call_start',
        status: 'model_calling',
        name: options.modelName,
        data: {
          provider: options.modelProvider,
          model: options.modelName
        },
        message: 'Real model stream started'
      })

      const firstMessages: ModelMessage[] = [
        {
          role: 'system',
          content: [
            '你是 Super Agent Console 的演示智能体。',
            '如果用户输入包含岗位 JD、招聘要求、面试准备、候选人背景等内容，必须调用 analyzeJobAndGeneratePlan 工具。',
            '不要编造不存在的工具名；工具参数必须符合 schema。',
            '如果确实不需要工具，可以直接用中文回答。'
          ].join('\n')
        },
        {
          role: 'user',
          content: normalizedInput
        }
      ]
      const toolCalls: ModelToolCall[] = []
      let modelAnalysis = ''

      for await (const streamEvent of model.stream({
        messages: firstMessages,
        tools: realAgentTools,
        temperature: options.temperature,
        topP: options.topP,
        maxTokens: options.maxTokens
      })) {
        if (streamEvent.type === 'text_delta' && streamEvent.content) {
          const currentOffset = modelTextOffset
          modelAnalysis += streamEvent.content
          modelTextOffset += streamEvent.content.length

          yield createEvent({
            eventType: 'model_text_delta',
            status: 'model_calling',
            name: options.modelName,
            data: {
              content: streamEvent.content,
              offset: currentOffset
            },
            message: 'Real model analysis delta'
          })
        }

        if (streamEvent.type === 'tool_call') {
          toolCalls.push(streamEvent.toolCall)
        }
      }

      const toolCall = toolCalls[0]

      if (!toolCall) {
        finalAnswer = modelAnalysis
      } else {
        yield createEvent({
          eventType: 'tool_call_start',
          status: 'tool_calling',
          name: toolCall.name,
          data: {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            args: toolCall.arguments
          },
          message: 'Real model tool call started'
        })

        const toolEvents: AgentEvent[] = []
        const toolExecution = await executeTool({
          name: toolCall.name,
          args: toolCall.arguments,
          onToolProgress(delta) {
            toolEvents.push(
              createEvent({
                eventType: 'tool_progress_delta',
                status: 'tool_calling',
                name: toolCall.name,
                data: {
                  toolCallId: toolCall.id,
                  toolName: toolCall.name,
                  content: delta.content,
                  offset: delta.offset,
                  stage: delta.stage
                },
                message: 'Real tool progress delta'
              })
            )
          },
          onSkillStart(skillExecution) {
            toolEvents.push(
              createEvent({
                eventType: 'skill_start',
                status: 'skill_running',
                name: skillExecution.skillName,
                data: {
                  toolCallId: toolCall.id,
                  stepId: skillExecution.stepId,
                  skillRunId: skillExecution.skillRunId,
                  skillName: skillExecution.skillName,
                  input: skillExecution.input
                },
                message: 'Real skill started'
              })
            )
          },
          onSkillProgress(skillExecution, delta) {
            toolEvents.push(
              createEvent({
                eventType: 'skill_progress_delta',
                status: 'skill_running',
                name: skillExecution.skillName,
                data: {
                  toolCallId: toolCall.id,
                  stepId: skillExecution.stepId,
                  skillRunId: skillExecution.skillRunId,
                  skillName: skillExecution.skillName,
                  content: delta.content,
                  offset: delta.offset,
                  stage: delta.stage
                },
                message: 'Real skill progress delta'
              })
            )
          },
          onSkillResult(skillExecution) {
            toolEvents.push(
              createEvent({
                eventType: 'skill_result',
                status: 'skill_running',
                name: skillExecution.skillName,
                data: {
                  toolCallId: toolCall.id,
                  stepId: skillExecution.stepId,
                  skillRunId: skillExecution.skillRunId,
                  skillName: skillExecution.skillName,
                  result: skillExecution.result
                },
                message: 'Real skill finished'
              })
            )
          }
        })

        for (const toolEvent of toolEvents) {
          yield toolEvent
        }

        yield createEvent({
          eventType: 'tool_call_result',
          status: 'tool_calling',
          name: toolExecution.tool.name,
          data: {
            toolCallId: toolCall.id,
            toolName: toolExecution.tool.name,
            result: toolExecution.result
          },
          message: 'Real tool call finished'
        })

        yield createEvent({
          eventType: 'model_call_start',
          status: 'generating',
          name: options.modelName,
          data: {
            provider: options.modelProvider,
            model: options.modelName,
            phase: 'final_answer'
          },
          message: 'Real model final answer stream started'
        })

        for await (const streamEvent of model.stream({
          messages: [
            ...firstMessages,
            {
              role: 'assistant',
              content: modelAnalysis,
              toolCalls: [toolCall]
            },
            {
              role: 'tool',
              toolCallId: toolCall.id,
              content: JSON.stringify(toolExecution.result)
            },
            {
              role: 'user',
              content: '请基于工具结果，生成一份清晰、可执行的最终回答。'
            }
          ],
          temperature: options.temperature,
          topP: options.topP,
          maxTokens: options.maxTokens
        })) {
          if (streamEvent.type === 'text_delta' && streamEvent.content) {
            const currentOffset = finalAnswerOffset
            finalAnswer += streamEvent.content
            finalAnswerOffset += streamEvent.content.length

            yield createEvent({
              eventType: 'final_answer_delta',
              status: 'generating',
              name: options.modelName,
              data: {
                content: streamEvent.content,
                offset: currentOffset
              },
              message: 'Real model final answer delta'
            })
          }
        }
      }

      yield createEvent({
        eventType: 'agent_done',
        status: 'completed',
        data: {
          resultId: `result_${runId}`,
          provider: options.modelProvider,
          model: options.modelName
        },
        message: 'Real Agent Run finished'
      })
    } catch (error) {
      yield createEvent({
        eventType: 'agent_error',
        status: 'failed',
        data: {
          errorMessage: error instanceof Error ? error.message : 'Real Agent Run failed'
        },
        message: 'Real Agent Run failed'
      })
    }
  }

  return {
    provider: options.modelProvider,
    modelName: options.modelName,
    events: events(),
    getFinalAnswer() {
      return finalAnswer
    }
  }
}
