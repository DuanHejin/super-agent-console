import type { ModelAdapter, ModelRequest, ModelResponse, ModelStreamEvent } from '../../agent-config'
import { createDoubaoClient, type DoubaoClientOptions } from '../doubao-client'

export interface DoubaoModelAdapterOptions extends DoubaoClientOptions {
  provider?: 'doubao'
}

export function createDoubaoModelAdapter(options: DoubaoModelAdapterOptions): ModelAdapter {
  const client = createDoubaoClient(options)
  const complete = async (_request: ModelRequest): Promise<ModelResponse> => {
    if (!client.options.apiKey) {
      throw new Error('Doubao model adapter requires ARK_API_KEY before real model calls are enabled.')
    }

    throw new Error('Doubao model adapter is scaffolded but real completion is not implemented yet.')
  }

  return {
    provider: 'doubao',
    complete,
    async *stream(request: ModelRequest): AsyncIterable<ModelStreamEvent> {
      const response = await complete(request)
      if (response.content) {
        yield {
          type: 'text_delta',
          content: response.content
        }
      }
      yield {
        type: 'done'
      }
    }
  }
}
