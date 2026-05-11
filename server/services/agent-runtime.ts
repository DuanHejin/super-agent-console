import type { AgentEvent } from '../../types/agent-event'
import { createRunId, createTraceId } from '../utils/ids'

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
  const runId = options.runId ?? createRunId()
  const traceId = options.traceId ?? createTraceId()
  const baseEventFields = {
    conversationId: options.conversationId,
    messageId: options.messageId,
    runId,
    traceId
  }
  const timestamp = () => new Date().toISOString()
  let sequence = 0
  const nextSequence = () => {
    sequence += 1
    return sequence
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

  const events: AgentEvent[] = [
    {
      ...baseEventFields,
      eventType: 'run_started',
      sequence: nextSequence(),
      status: 'running',
      message: 'Mock Agent Run started',
      timestamp: timestamp()
    },
    {
      ...baseEventFields,
      eventType: 'prompt_loaded',
      sequence: nextSequence(),
      status: 'model_calling',
      promptName: 'mock-agent-default',
      message: 'Mock prompt loaded',
      timestamp: timestamp()
    },
    {
      ...baseEventFields,
      eventType: 'model_stream_started',
      sequence: nextSequence(),
      status: 'model_calling',
      model: 'mock-model',
      message: 'Mock model stream started',
      timestamp: timestamp()
    },
    {
      ...baseEventFields,
      eventType: 'tool_call_started',
      sequence: nextSequence(),
      status: 'tool_calling',
      toolCallId: 'tool_mock_parse_jd',
      toolName: 'parseJobDescription',
      args: {
        inputLength: normalizedInput.length
      },
      message: 'Mock tool call started',
      timestamp: timestamp()
    },
    {
      ...baseEventFields,
      eventType: 'tool_call_finished',
      sequence: nextSequence(),
      status: 'tool_calling',
      toolCallId: 'tool_mock_parse_jd',
      toolName: 'parseJobDescription',
      result: {
        role: 'frontend-engineer',
        keywords: ['Nuxt', 'Agent', 'SSE', 'K3S']
      },
      message: 'Mock tool call finished',
      timestamp: timestamp()
    },
    {
      ...baseEventFields,
      eventType: 'model_delta',
      sequence: nextSequence(),
      status: 'generating',
      content: finalAnswerChunks[0],
      message: 'Mock model output delta',
      timestamp: timestamp()
    },
    {
      ...baseEventFields,
      eventType: 'model_delta',
      sequence: nextSequence(),
      status: 'generating',
      content: finalAnswerChunks[1],
      message: 'Mock model output delta',
      timestamp: timestamp()
    },
    {
      ...baseEventFields,
      eventType: 'model_delta',
      sequence: nextSequence(),
      status: 'generating',
      content: finalAnswerChunks[2],
      message: 'Mock model output delta',
      timestamp: timestamp()
    },
    {
      ...baseEventFields,
      eventType: 'run_finished',
      sequence: nextSequence(),
      status: 'completed',
      resultId: `result_${runId}`,
      message: 'Mock Agent Run finished',
      timestamp: timestamp()
    }
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
