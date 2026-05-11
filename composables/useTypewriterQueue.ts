interface UseTypewriterQueueOptions {
  intervalMs?: number
  chunkSize?: number
}

export function useTypewriterQueue(options: UseTypewriterQueueOptions = {}) {
  const output = ref('')
  const isTyping = ref(false)
  const intervalMs = options.intervalMs ?? 24
  const chunkSize = options.chunkSize ?? 1
  let buffer = ''
  let timer: ReturnType<typeof setInterval> | undefined

  function stopTimer() {
    if (!timer) {
      return
    }

    clearInterval(timer)
    timer = undefined
  }

  function tick() {
    if (!buffer) {
      isTyping.value = false
      stopTimer()
      return
    }

    output.value += buffer.slice(0, chunkSize)
    buffer = buffer.slice(chunkSize)
  }

  function startTimer() {
    if (timer) {
      return
    }

    isTyping.value = true
    timer = setInterval(tick, intervalMs)
  }

  function enqueue(text: string) {
    if (!text) {
      return
    }

    buffer += text
    startTimer()
  }

  function flush() {
    output.value += buffer
    buffer = ''
    isTyping.value = false
    stopTimer()
  }

  function reset() {
    output.value = ''
    buffer = ''
    isTyping.value = false
    stopTimer()
  }

  onBeforeUnmount(stopTimer)

  return {
    output,
    isTyping,
    enqueue,
    flush,
    reset
  }
}
