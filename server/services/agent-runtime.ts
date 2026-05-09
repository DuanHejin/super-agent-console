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
  const runId = createRunId()
  const traceId = createTraceId()
  const timestamp = () => new Date().toISOString()
  const normalizedInput = options.input.trim()
  const inputPreview = normalizedInput.slice(0, 80) || '未提供输入'
  const finalAnswer = [
    `已收到输入：${inputPreview}`,
    '这是一次 Mock Agent Run，用于验证前端输入、服务端编排、Timeline 展示和运行元信息。',
    '下一阶段会把这条链路改造成 SSE 流式事件。'
  ].join('\n')

  const events: AgentEvent[] = [
    {
      type: 'agent_start',
      runId,
      traceId,
      timestamp: timestamp()
    },
    {
      type: 'prompt_loaded',
      runId,
      traceId,
      promptName: 'mock-agent-default',
      timestamp: timestamp()
    },
    {
      type: 'model_stream_start',
      runId,
      traceId,
      model: 'mock-model',
      timestamp: timestamp()
    },
    {
      type: 'tool_call_start',
      runId,
      traceId,
      toolCallId: 'tool_mock_parse_jd',
      toolName: 'parseJobDescription',
      args: {
        inputLength: normalizedInput.length
      },
      timestamp: timestamp()
    },
    {
      type: 'tool_call_result',
      runId,
      traceId,
      toolCallId: 'tool_mock_parse_jd',
      toolName: 'parseJobDescription',
      result: {
        role: 'frontend-engineer',
        keywords: ['Nuxt', 'Agent', 'SSE', 'K3S']
      },
      timestamp: timestamp()
    },
    {
      type: 'final_answer_delta',
      runId,
      traceId,
      content: finalAnswer,
      timestamp: timestamp()
    },
    {
      type: 'agent_done',
      runId,
      traceId,
      resultId: `result_${runId}`,
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
