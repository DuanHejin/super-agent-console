import type { ModelAdapter, ModelDefinition, ModelProvider } from '../../agent-config'
import { createDoubaoModelAdapter } from './doubao-model-adapter'
import { createMockModelAdapter } from './mock-model-adapter'

/** 创建模型适配器所需的运行时参数。 */
export interface CreateModelAdapterOptions {
  provider: ModelProvider
  /** 从 runtime config/env 读取的供应商 API key，不从模型配置文件读取。 */
  apiKey?: string
  /** 从 runtime config/env 读取的供应商 base URL。 */
  baseUrl?: string
  /** 供应商侧模型 id 覆盖值。 */
  modelId?: string
}

/** 模型适配器工厂，用于隔离 Agent Runtime 和具体供应商构造细节。 */
export function createModelAdapter(options: CreateModelAdapterOptions): ModelAdapter {
  if (options.provider === 'mock') {
    return createMockModelAdapter()
  }

  if (options.provider === 'doubao') {
    return createDoubaoModelAdapter({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      modelId: options.modelId
    })
  }

  throw new Error(`Model provider ${options.provider} is not implemented yet.`)
}

/** 根据模型配置创建适配器。敏感信息仍必须来自运行时环境变量。 */
export function createModelAdapterFromDefinition(definition: ModelDefinition): ModelAdapter {
  return createModelAdapter({
    provider: definition.provider,
    modelId: definition.modelId
  })
}
