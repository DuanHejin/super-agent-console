import type { ModelDefinition } from './types'

export const defaultModelProvider = 'mock'

export const modelDefinitions = [
  {
    provider: 'mock',
    displayName: 'Mock Model',
    modelId: 'mock-agent-model',
    enabled: true,
    defaultOptions: {
      temperature: 0,
      topP: 1,
      maxTokens: 2048
    }
  },
  {
    provider: 'volcengine_ark',
    displayName: 'Volcengine Ark / Doubao Seed',
    modelId: 'doubao-seed-2-0-lite-260428',
    enabled: false,
    defaultOptions: {
      temperature: 0.2,
      topP: 0.8,
      maxTokens: 4096
    },
    runtimeEnvKeys: {
      apiKey: 'MODEL_API_KEY',
      baseUrl: 'MODEL_BASE_URL'
    }
  },
  {
    provider: 'openai-compatible',
    displayName: 'OpenAI Compatible',
    modelId: 'openai-compatible-placeholder',
    enabled: false,
    defaultOptions: {
      temperature: 0.3,
      topP: 0.9,
      maxTokens: 4096
    },
    runtimeEnvKeys: {
      apiKey: 'OPENAI_COMPATIBLE_API_KEY',
      baseUrl: 'OPENAI_COMPATIBLE_BASE_URL'
    }
  }
] as const satisfies readonly ModelDefinition[]

export function getModelDefinition(provider: string): ModelDefinition | undefined {
  return modelDefinitions.find((model) => model.provider === provider)
}
