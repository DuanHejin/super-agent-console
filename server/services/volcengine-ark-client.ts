import type {
  ModelMessage,
  ModelRequest,
  ModelResponse,
  ModelToolCall,
  ModelStreamEvent,
  ToolDefinition
} from '../agent-config'

export interface VolcengineArkClientOptions {
  apiKey?: string
  modelId?: string
  baseUrl?: string
}

interface ArkChatCompletionChoice {
  message?: {
    content?: unknown
    tool_calls?: unknown
  }
  delta?: {
    content?: unknown
    tool_calls?: unknown
  }
  finish_reason?: string | null
}

interface ArkChatCompletionResponse {
  choices?: ArkChatCompletionChoice[]
}

interface ArkStreamToolCallAccumulator {
  id?: string
  name?: string
  argumentsText: string
}

const defaultBaseUrl = 'https://ark.cn-beijing.volces.com/api/v3'

export function createVolcengineArkClient(options: VolcengineArkClientOptions) {
  const normalizedBaseUrl = normalizeBaseUrl(options.baseUrl)

  return {
    options: {
      ...options,
      baseUrl: normalizedBaseUrl
    },
    async complete(request: ModelRequest): Promise<ModelResponse> {
      const response = await fetchArkChatCompletion({
        options: {
          ...options,
          baseUrl: normalizedBaseUrl
        },
        request,
        stream: false
      })
      const json = (await response.json()) as ArkChatCompletionResponse
      const message = json.choices?.[0]?.message

      return {
        content: extractTextContent(message?.content),
        toolCalls: parseToolCalls(message?.tool_calls),
        raw: json
      }
    },
    async *stream(request: ModelRequest): AsyncIterable<ModelStreamEvent> {
      const response = await fetchArkChatCompletion({
        options: {
          ...options,
          baseUrl: normalizedBaseUrl
        },
        request,
        stream: true
      })

      yield* parseArkSseStream(response)
    }
  }
}

async function fetchArkChatCompletion(options: {
  options: VolcengineArkClientOptions
  request: ModelRequest
  stream: boolean
}) {
  if (!options.options.apiKey) {
    throw new Error('Volcengine Ark client requires MODEL_API_KEY.')
  }

  if (!options.options.modelId) {
    throw new Error('Volcengine Ark client requires MODEL_NAME.')
  }

  const body = {
    model: options.options.modelId,
    stream: options.stream,
    messages: options.request.messages.map(toArkMessage),
    temperature: options.request.temperature,
    top_p: options.request.topP,
    max_tokens: options.request.maxTokens,
    ...toArkToolOptions(options.request.tools)
  }

  const response = await fetch(`${options.options.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.options.apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`Volcengine Ark request failed: ${response.status} ${errorText}`)
  }

  return response
}

function toArkMessage(message: ModelMessage) {
  const arkMessage: Record<string, unknown> = {
    role: message.role === 'developer' ? 'system' : message.role,
    content: message.content
  }

  if (message.role === 'tool' && message.toolCallId) {
    arkMessage.tool_call_id = message.toolCallId
  }

  if (message.toolCalls?.length) {
    arkMessage.tool_calls = message.toolCalls.map(toArkToolCall)
  }

  return arkMessage
}

function toArkToolOptions(tools?: readonly ToolDefinition[]) {
  const enabledTools = tools?.filter((tool) => tool.enabled) ?? []

  if (!enabledTools.length) {
    return {}
  }

  return {
    tools: enabledTools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    })),
    tool_choice: 'auto'
  }
}

function toArkToolCall(toolCall: ModelToolCall) {
  return {
    id: toolCall.id,
    type: 'function',
    function: {
      name: toolCall.name,
      arguments: JSON.stringify(toolCall.arguments)
    }
  }
}

async function* parseArkSseStream(response: Response): AsyncIterable<ModelStreamEvent> {
  const reader = response.body?.getReader()

  if (!reader) {
    throw new Error('Volcengine Ark stream response has no readable body.')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let doneEmitted = false
  const toolCallAccumulators = new Map<number, ArkStreamToolCallAccumulator>()

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replace(/\r\n/g, '\n')
    const events = splitSseEvents(buffer)
    buffer = events.remaining

    for (const rawEvent of events.completeEvents) {
      for (const streamEvent of parseArkSseEvent(rawEvent, toolCallAccumulators)) {
        if (streamEvent.type === 'done') {
          doneEmitted = true
        }

        yield streamEvent
      }
    }
  }

  buffer += decoder.decode()
  buffer = buffer.replace(/\r\n/g, '\n')

  if (buffer.trim()) {
    for (const streamEvent of parseArkSseEvent(buffer, toolCallAccumulators)) {
      if (streamEvent.type === 'done') {
        doneEmitted = true
      }

      yield streamEvent
    }
  }

  if (!doneEmitted) {
    yield {
      type: 'done'
    }
  }
}

function splitSseEvents(buffer: string) {
  const completeEvents: string[] = []
  let remaining = buffer
  let separatorIndex = remaining.indexOf('\n\n')

  while (separatorIndex >= 0) {
    completeEvents.push(remaining.slice(0, separatorIndex))
    remaining = remaining.slice(separatorIndex + 2)
    separatorIndex = remaining.indexOf('\n\n')
  }

  return {
    completeEvents,
    remaining
  }
}

function parseArkSseEvent(
  rawEvent: string,
  toolCallAccumulators: Map<number, ArkStreamToolCallAccumulator>
): ModelStreamEvent[] {
  const events: ModelStreamEvent[] = []
  const dataLines = rawEvent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s*/, ''))

  for (const dataLine of dataLines) {
    if (!dataLine || dataLine === '[DONE]') {
      events.push({
        type: 'done'
      })
      continue
    }

    const parsed = JSON.parse(dataLine) as ArkChatCompletionResponse
    const choice = parsed.choices?.[0]
    const content = extractTextContent(choice?.delta?.content)

    if (content) {
      events.push({
        type: 'text_delta',
        content
      })
    }

    collectStreamToolCallDelta(choice?.delta?.tool_calls, toolCallAccumulators)

    if (choice?.finish_reason) {
      for (const toolCall of flushStreamToolCalls(toolCallAccumulators)) {
        events.push({
          type: 'tool_call',
          toolCall
        })
      }
      events.push({
        type: 'done'
      })
    }
  }

  return events
}

function collectStreamToolCallDelta(
  value: unknown,
  accumulators: Map<number, ArkStreamToolCallAccumulator>
) {
  if (!Array.isArray(value)) {
    return
  }

  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }

    const index = typeof item.index === 'number' ? item.index : accumulators.size
    const current = accumulators.get(index) ?? {
      argumentsText: ''
    }
    const functionValue = item.function

    if (typeof item.id === 'string') {
      current.id = item.id
    }

    if (isRecord(functionValue)) {
      if (typeof functionValue.name === 'string') {
        current.name = functionValue.name
      }

      if (typeof functionValue.arguments === 'string') {
        current.argumentsText += functionValue.arguments
      }
    }

    accumulators.set(index, current)
  }
}

function flushStreamToolCalls(accumulators: Map<number, ArkStreamToolCallAccumulator>): ModelToolCall[] {
  const toolCalls = Array.from(accumulators.entries())
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([, item]): ModelToolCall | undefined => {
      if (!item.id || !item.name) {
        return undefined
      }

      return {
        id: item.id,
        name: item.name,
        arguments: parseToolArguments(item.argumentsText)
      }
    })
    .filter((item): item is ModelToolCall => Boolean(item))

  accumulators.clear()

  return toolCalls
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }

        if (isRecord(part) && typeof part.text === 'string') {
          return part.text
        }

        return ''
      })
      .join('')
  }

  return ''
}

function parseToolCalls(value: unknown): ModelToolCall[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item): ModelToolCall | undefined => {
      if (!isRecord(item)) {
        return undefined
      }

      const id = typeof item.id === 'string' ? item.id : undefined
      const functionValue = item.function

      if (!id || !isRecord(functionValue) || typeof functionValue.name !== 'string') {
        return undefined
      }

      return {
        id,
        name: functionValue.name,
        arguments: parseToolArguments(functionValue.arguments)
      }
    })
    .filter((item): item is ModelToolCall => Boolean(item))
}

function parseToolArguments(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value
  }

  if (typeof value !== 'string' || !value.trim()) {
    return {}
  }

  try {
    const parsed = JSON.parse(value) as unknown

    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeBaseUrl(baseUrl?: string) {
  return (baseUrl || defaultBaseUrl).replace(/\/+$/, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
