import type { ModelAdapter, ModelDefinition, ModelProvider } from '../../agent-config'
import { createDoubaoModelAdapter } from './doubao-model-adapter'
import { createMockModelAdapter } from './mock-model-adapter'

export interface CreateModelAdapterOptions {
  provider: ModelProvider
  apiKey?: string
  baseUrl?: string
  modelId?: string
}

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

export function createModelAdapterFromDefinition(definition: ModelDefinition): ModelAdapter {
  return createModelAdapter({
    provider: definition.provider,
    modelId: definition.modelId
  })
}
