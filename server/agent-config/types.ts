/** MVP Tool/Skill 配置层支持的 JSON Schema 类型。 */
export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'

/**
 * 轻量版 JSON Schema，用于校验 Tool 参数和 Skill 输入/输出。
 * 这里故意只实现完整 JSON Schema 的一小部分，方便后续配置后台按同样结构存储。
 */
export interface JsonSchema {
  /** 当前值期望的基础类型或容器类型。 */
  type: JsonSchemaType
  /** 字段说明，方便人工 review，也可用于后续生成模型 Tool Schema。 */
  description?: string
  /** 当 `type` 为 `object` 时，定义对象内部字段。 */
  properties?: Record<string, JsonSchema>
  /** 当 `type` 为 `array` 时，定义数组元素类型。 */
  items?: JsonSchema
  /** 当 `type` 为 `object` 时，定义必填字段。 */
  required?: string[]
  /** 字符串枚举白名单，适合限制语言、模式这类固定取值。 */
  enum?: string[]
}

/** Skill 在当前运行时中的执行方式。 */
export type SkillExecutionMode = 'mock' | 'rule' | 'model' | 'external'

/** 可复用 Skill 步骤的配置定义，用于 Tool 内部 workflow 编排。 */
export interface SkillDefinition {
  /** 稳定配置 id，供 workflow 和运行时查找使用。 */
  name: string
  /** 展示名称，供后续配置后台和 Trace 页面使用。 */
  displayName: string
  /** Skill 的能力说明和使用场景。 */
  description: string
  /** 调用 Skill handler 之前校验的输入契约。 */
  inputSchema: JsonSchema
  /** Skill handler 返回后校验的输出契约。 */
  outputSchema: JsonSchema
  /** 将配置映射到可执行 handler 的运行时绑定。 */
  execution: {
    mode: SkillExecutionMode
    /** `server/services/skill-executor.ts` 中的 handler 注册键。 */
    handlerName: string
  }
}

/** 模型可见的 Tool 定义。Tool 是暴露给 LLM tool calling 的能力边界。 */
export interface ToolDefinition {
  /** 稳定 Tool 名称，由模型返回，并由 Tool Router 路由。 */
  name: string
  /** 展示名称，供 UI 和调试使用。 */
  displayName: string
  /** 面向模型的 Tool 能力说明。 */
  description: string
  /** Tool 参数的 JSON Schema。 */
  parameters: JsonSchema
  /** 编排内部 Skill 步骤的 workflow 配置名。 */
  workflowName: string
  /** 白名单开关。即使模型要求调用，禁用的 Tool 也不能执行。 */
  enabled: boolean
}

/** Tool workflow 中的一个步骤。 */
export interface ToolWorkflowStep {
  /** 稳定步骤 id，后续可通过 `$steps.step-id.output` 等表达式引用。 */
  id: string
  /** 当前步骤要执行的 Skill 配置名。 */
  skillName: string
  /** 将 Tool 参数或前序步骤输出映射为当前 Skill 输入。 */
  inputMapping: Record<string, string>
}

/** 隶属于某个 Tool 的有序 Skill workflow。 */
export interface ToolWorkflowDefinition {
  /** 稳定 workflow 配置名。 */
  name: string
  /** 当前 workflow 所属的 Tool 名称。 */
  toolName: string
  /** workflow 目标说明。 */
  description: string
  /** 有序 Skill 步骤。MVP 阶段按顺序串行执行。 */
  steps: ToolWorkflowStep[]
}

/** 当前模型适配器接口支持的模型供应商。 */
export type ModelProvider = 'mock' | 'doubao' | 'openai-compatible'

/** 可选择的大模型供应商/模型配置。 */
export interface ModelDefinition {
  /** 模型适配器供应商 key。 */
  provider: ModelProvider
  /** 展示名称，供后续配置后台和 Trace 页面使用。 */
  displayName: string
  /** 供应商侧的模型 id。 */
  modelId: string
  /** 当前模型是否允许被运行时配置选中。 */
  enabled: boolean
  /** 传给模型适配器的默认生成参数。 */
  defaultOptions: {
    temperature: number
    topP: number
    maxTokens: number
  }
  /** 当前供应商需要读取的运行时环境变量名。这里只存 key，不存敏感值。 */
  runtimeEnvKeys?: {
    apiKey?: string
    baseUrl?: string
  }
}

/** 传给模型适配器的对话消息角色。 */
export type ModelMessageRole = 'system' | 'developer' | 'user' | 'assistant' | 'tool'

/** 所有模型适配器共用的标准消息结构。 */
export interface ModelMessage {
  role: ModelMessageRole
  content: string
  /** Tool 结果消息可通过该字段关联它回答的是哪次 tool call。 */
  toolCallId?: string
}

/** 模型适配器返回的标准 tool call 结构。 */
export interface ModelToolCall {
  /** 供应商或运行时生成的 tool call id。 */
  id: string
  /** 需要交给 Tool Router 路由的 Tool 名称。 */
  name: string
  /** JSON 对象参数，需要按 Tool Schema 校验。 */
  arguments: Record<string, unknown>
}

/** 所有模型适配器接收的标准请求结构。 */
export interface ModelRequest {
  messages: ModelMessage[]
  /** 当前可提供给模型的 enabled Tool 定义。 */
  tools?: readonly ToolDefinition[]
  temperature?: number
  topP?: number
  maxTokens?: number
}

/** 标准非流式模型响应。 */
export interface ModelResponse {
  content: string
  toolCalls?: ModelToolCall[]
  /** 供应商原始响应，仅用于调试，不要在运行时逻辑中依赖。 */
  raw?: unknown
}

/** 模型适配器输出的供应商无关流式事件。 */
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

/** 模型供应商适配器边界。Agent Runtime 应依赖该接口，而不是直接依赖 SDK 细节。 */
export interface ModelAdapter {
  provider: ModelProvider
  complete(request: ModelRequest): Promise<ModelResponse>
  stream(request: ModelRequest): AsyncIterable<ModelStreamEvent>
}
