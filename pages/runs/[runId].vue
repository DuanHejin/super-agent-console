<template>
  <main class="run-page">
    <nav class="page-nav">
      <NuxtLink to="/">返回控制台</NuxtLink>
      <NuxtLink to="/runs">Run 列表</NuxtLink>
      <NuxtLink to="/conversations">Conversation 列表</NuxtLink>
    </nav>

    <section class="panel">
      <h1>Run 详情</h1>
      <p v-if="pending">正在加载 Run 详情。</p>
      <p v-else-if="error" class="error">Run 详情加载失败：{{ error.message }}</p>
      <template v-else-if="run">
        <dl class="meta-grid">
          <div>
            <dt>runId</dt>
            <dd>{{ run.runId }}</dd>
          </div>
          <div>
            <dt>traceId</dt>
            <dd>{{ run.traceId }}</dd>
          </div>
          <div>
            <dt>status</dt>
            <dd>{{ run.status }}</dd>
          </div>
          <div>
            <dt>events</dt>
            <dd>{{ run.events.length }}</dd>
          </div>
          <div>
            <dt>createdAt</dt>
            <dd>{{ formatLocalDateTime(run.createdAt) }}</dd>
          </div>
          <div>
            <dt>updatedAt</dt>
            <dd>{{ formatLocalDateTime(run.updatedAt) }}</dd>
          </div>
        </dl>
      </template>
    </section>

    <template v-if="run">
      <section class="panel">
        <h2>用户输入</h2>
        <pre>{{ run.input }}</pre>
      </section>

      <section class="panel">
        <h2>最终答案</h2>
        <MarkdownContent v-if="run.finalAnswer" :content="run.finalAnswer" />
        <p v-else>当前 Run 尚未写入最终答案。</p>
      </section>

      <ToolCallCard
        :tools="toolProcesses"
        :status="timelineStatus"
      />

      <AgentTimeline
        :events="run.events"
        :status="timelineStatus"
      />
    </template>
  </main>
</template>

<script setup lang="ts">
import type { AgentEvent } from '../../types/agent-event'
import type { AgentRunDetailResponse } from '../../types/agent-run'

const route = useRoute()
const runId = computed(() => String(route.params.runId || ''))
const { data: run, pending, error } = await useFetch<AgentRunDetailResponse>(() => `/api/agent/runs/${runId.value}`)
const detailEvents = computed<AgentEvent[]>(() => run.value?.events ?? [])
const { toolProcesses } = useToolSkillProcess(detailEvents)
const { formatLocalDateTime } = useLocalDateTime()

const timelineStatus = computed(() => {
  if (!run.value) {
    return 'idle'
  }

  if (run.value.status === 'completed') {
    return 'success'
  }

  if (run.value.status === 'failed') {
    return 'failed'
  }

  return 'running'
})
</script>

<style scoped>
.run-page {
  display: grid;
  gap: 16px;
  max-width: 1040px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.page-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.page-nav a {
  width: fit-content;
  color: #2563eb;
  font-size: 14px;
  text-decoration: none;
}

.panel {
  padding: 20px;
  border: 1px solid #dce3e6;
  border-radius: 8px;
  background: #fff;
}

h1,
h2 {
  margin: 0 0 12px;
  color: #172026;
  letter-spacing: 0;
}

h1 {
  font-size: 24px;
}

h2 {
  font-size: 18px;
}

p {
  margin: 0;
  color: #526068;
}

.error {
  color: #9d2b2b;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin: 0;
}

dt {
  color: #526068;
  font-size: 12px;
}

dd {
  margin: 4px 0 0;
  color: #172026;
  font-size: 13px;
  overflow-wrap: anywhere;
}

pre {
  overflow: auto;
  margin: 0;
  padding: 12px;
  border: 1px solid #dce3e6;
  border-radius: 6px;
  background: #f7f9fa;
  color: #172026;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

</style>
