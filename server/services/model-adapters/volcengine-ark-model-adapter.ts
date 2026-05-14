import type { ModelAdapter, ModelRequest, ModelResponse, ModelStreamEvent } from '../../agent-config'
import { createVolcengineArkClient, type VolcengineArkClientOptions } from '../volcengine-ark-client'

export interface VolcengineArkModelAdapterOptions extends VolcengineArkClientOptions {
  provider?: 'volcengine_ark'
}

export function createVolcengineArkModelAdapter(options: VolcengineArkModelAdapterOptions): ModelAdapter {
  const client = createVolcengineArkClient(options)

  return {
    provider: 'volcengine_ark',
    complete(request: ModelRequest): Promise<ModelResponse> {
      return client.complete(request)
    },
    stream(request: ModelRequest): AsyncIterable<ModelStreamEvent> {
      return client.stream(request)
    }
  }
}
