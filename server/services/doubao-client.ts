export interface DoubaoClientOptions {
  apiKey?: string
  modelId?: string
  baseUrl?: string
}

export function createDoubaoClient(options: DoubaoClientOptions) {
  return {
    options
  }
}
