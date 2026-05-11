import type { AgentEvent } from '../types/agent-event'

interface OpenAgentStreamOptions {
  runId: string
  onEvent: (event: AgentEvent) => void
}

export function useSseStream() {
  const loading = ref(false)
  const error = ref<string>()

  async function openAgentStream(options: OpenAgentStreamOptions) {
    loading.value = true
    error.value = undefined

    try {
      const response = await fetch(`/api/agent/runs/${options.runId}/events`, {
        method: 'GET',
        headers: {
          accept: 'text/event-stream'
        }
      })

      if (!response.ok || !response.body) {
        throw new Error(`SSE request failed with status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() || ''

        for (const chunk of chunks) {
          const dataLine = chunk
            .split('\n')
            .find((line) => line.startsWith('data:'))

          if (!dataLine) {
            continue
          }

          const data = dataLine.replace(/^data:\s?/, '')

          if (data === '[DONE]') {
            continue
          }

          options.onEvent(JSON.parse(data) as AgentEvent)
        }
      }
    } catch (streamError) {
      error.value = streamError instanceof Error ? streamError.message : 'SSE stream failed'
      throw streamError
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    openAgentStream
  }
}
