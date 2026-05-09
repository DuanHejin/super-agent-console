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
}

export async function runMockAgent(options: RunMockAgentOptions): Promise<MockAgentRunResult> {
  const result = createMockAgentRun(options)

  return result
}

export function createMockAgentRun(options: RunMockAgentOptions): MockAgentRunResult {
  const runId = createRunId()
  const traceId = createTraceId()
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
      eventType: 'run_started',
      runId,
      traceId,
      sequence: nextSequence(),
      message: 'Mock Agent Run started',
      timestamp: timestamp()
    },
    {
      eventType: 'prompt_loaded',
      runId,
      traceId,
      sequence: nextSequence(),
      promptName: 'mock-agent-default',
      message: 'Mock prompt loaded',
      timestamp: timestamp()
    },
    {
      eventType: 'model_stream_started',
      runId,
      traceId,
      sequence: nextSequence(),
      model: 'mock-model',
      message: 'Mock model stream started',
      timestamp: timestamp()
    },
    {
      eventType: 'tool_call_started',
      runId,
      traceId,
      sequence: nextSequence(),
      toolCallId: 'tool_mock_parse_jd',
      toolName: 'parseJobDescription',
      args: {
        inputLength: normalizedInput.length
      },
      message: 'Mock tool call started',
      timestamp: timestamp()
    },
    {
      eventType: 'tool_call_finished',
      runId,
      traceId,
      sequence: nextSequence(),
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
      eventType: 'model_delta',
      runId,
      traceId,
      sequence: nextSequence(),
      content: finalAnswerChunks[0],
      message: 'Mock model output delta',
      timestamp: timestamp()
    },
    {
      eventType: 'model_delta',
      runId,
      traceId,
      sequence: nextSequence(),
      content: finalAnswerChunks[1],
      message: 'Mock model output delta',
      timestamp: timestamp()
    },
    {
      eventType: 'model_delta',
      runId,
      traceId,
      sequence: nextSequence(),
      content: finalAnswerChunks[2],
      message: 'Mock model output delta',
      timestamp: timestamp()
    },
    {
      eventType: 'run_finished',
      runId,
      traceId,
      sequence: nextSequence(),
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
