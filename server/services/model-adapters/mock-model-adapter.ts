import type { ModelAdapter, ModelRequest, ModelResponse, ModelStreamEvent } from '../../agent-config'

export function createMockModelAdapter(): ModelAdapter {
  const complete = async (request: ModelRequest): Promise<ModelResponse> => {
    const userMessage = [...request.messages].reverse().find((message) => message.role === 'user')
    const input = userMessage?.content?.trim() || '未提供输入'
    const firstTool = request.tools?.find((tool) => tool.enabled)

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
