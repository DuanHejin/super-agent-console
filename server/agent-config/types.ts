export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'

export interface JsonSchema {
  type: JsonSchemaType
  description?: string
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  enum?: string[]
}

export type SkillExecutionMode = 'mock' | 'rule' | 'model' | 'external'

export interface SkillDefinition {
  name: string
  displayName: string
  description: string
  inputSchema: JsonSchema
  outputSchema: JsonSchema
  execution: {
    mode: SkillExecutionMode
    handlerName: string
  }
}

export interface ToolDefinition {
  name: string
  displayName: string
  description: string
  parameters: JsonSchema
  workflowName: string
  enabled: boolean
}

export interface ToolWorkflowStep {
  id: string
  skillName: string
  inputMapping: Record<string, string>
}

export interface ToolWorkflowDefinition {
  name: string
  toolName: string
  description: string
  steps: ToolWorkflowStep[]
}

export type ModelProvider = 'mock' | 'doubao' | 'openai-compatible'

export interface ModelDefinition {
  provider: ModelProvider
  displayName: string
  modelId: string
  enabled: boolean
  defaultOptions: {
    temperature: number
    topP: number
    maxTokens: number
  }
  runtimeEnvKeys?: {
    apiKey?: string
    baseUrl?: string
  }
}

export type ModelMessageRole = 'system' | 'developer' | 'user' | 'assistant' | 'tool'

export interface ModelMessage {
  role: ModelMessageRole
  content: string
  toolCallId?: string
}

export interface ModelToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ModelRequest {
  messages: ModelMessage[]
  tools?: ToolDefinition[]
  temperature?: number
  topP?: number
  maxTokens?: number
}

export interface ModelResponse {
  content: string
  toolCalls?: ModelToolCall[]
  raw?: unknown
}

export type ModelStreamEvent =
  | {
      type: 'text_delta'
      content: string
    }
  | {
      type: 'tool_call'
      toolCall: ModelToolCall
    }
  | {
      type: 'done'
    }

export interface ModelAdapter {
  provider: ModelProvider
  complete(request: ModelRequest): Promise<ModelResponse>
  stream(request: ModelRequest): AsyncIterable<ModelStreamEvent>
}
