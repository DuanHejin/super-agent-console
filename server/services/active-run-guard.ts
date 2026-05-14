const activeRunIdsByKey = new Map<string, Set<string>>()

export interface AcquireActiveRunOptions {
  key: string
  runId: string
  limit: number
}

export interface AcquireActiveRunResult {
  allowed: boolean
  activeCount: number
  release: () => void
}

export function acquireActiveRun(options: AcquireActiveRunOptions): AcquireActiveRunResult {
  const activeRunIds = activeRunIdsByKey.get(options.key) ?? new Set<string>()

  if (!activeRunIds.has(options.runId) && activeRunIds.size >= options.limit) {
    return {
      allowed: false,
      activeCount: activeRunIds.size,
      release: () => {}
    }
  }

  activeRunIds.add(options.runId)
  activeRunIdsByKey.set(options.key, activeRunIds)

  return {
    allowed: true,
    activeCount: activeRunIds.size,
    release() {
      activeRunIds.delete(options.runId)

      if (!activeRunIds.size) {
        activeRunIdsByKey.delete(options.key)
      }
    }
  }
}
