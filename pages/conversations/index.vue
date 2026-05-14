<template>
  <main class="list-page">
    <nav class="page-nav">
      <NuxtLink to="/">控制台</NuxtLink>
      <NuxtLink to="/runs">Run 列表</NuxtLink>
    </nav>

    <section class="panel">
      <div class="heading-row">
        <div>
          <h1>Conversation 列表</h1>
          <p>查看会话、最新 Run 状态，以及进入对应 Run 详情。</p>
        </div>
        <button type="button" @click="refresh()">刷新</button>
      </div>

      <p v-if="pending">正在加载 Conversation 列表。</p>
      <p v-else-if="error" class="error">Conversation 列表加载失败：{{ error.message }}</p>
      <div v-else-if="conversations.length" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>title</th>
              <th>latest status</th>
              <th>runs</th>
              <th>updatedAt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="conversation in conversations" :key="conversation.conversationId">
              <td>
                <strong>{{ conversation.title || conversation.conversationId }}</strong>
                <small>{{ conversation.conversationId }}</small>
              </td>
              <td>{{ conversation.latestRunStatus || '-' }}</td>
              <td>{{ conversation.runCount }}</td>
              <td>{{ formatLocalDateTime(conversation.updatedAt) }}</td>
              <td>
                <NuxtLink v-if="conversation.latestRunId" :to="`/runs/${conversation.latestRunId}`">
                  查看最新 Run
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else>暂无 Conversation。</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { ConversationListItem } from '../../types/agent-run'

const { formatLocalDateTime } = useLocalDateTime()
const { data: authStatus } = await useFetch<{ authenticated: boolean, userId?: string, isAdmin: boolean }>('/api/auth/me')

if (!import.meta.dev && !authStatus.value?.isAdmin) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
}

const { data, pending, error, refresh } = await useFetch<{ items: ConversationListItem[] }>('/api/conversations')
const conversations = computed(() => data.value?.items ?? [])
</script>

<style scoped>
.list-page {
  display: grid;
  gap: 16px;
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.page-nav,
.heading-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.page-nav {
  justify-content: flex-start;
}

.page-nav a,
td a {
  color: #2563eb;
  text-decoration: none;
}

.panel {
  padding: 20px;
  border: 1px solid #dce3e6;
  border-radius: 8px;
  background: #fff;
}

h1 {
  margin: 0 0 8px;
  color: #172026;
  font-size: 24px;
  letter-spacing: 0;
}

p {
  margin: 0;
  color: #526068;
}

button {
  padding: 8px 12px;
  border: 1px solid #c9d4d8;
  border-radius: 6px;
  background: #fff;
  color: #172026;
  cursor: pointer;
}

.table-wrap {
  overflow-x: auto;
  margin-top: 16px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 10px 8px;
  border-bottom: 1px solid #edf2f4;
  color: #172026;
  font-size: 13px;
  text-align: left;
  vertical-align: top;
}

th {
  color: #526068;
  font-size: 12px;
}

strong,
small {
  display: block;
}

small {
  margin-top: 4px;
  color: #526068;
  overflow-wrap: anywhere;
}

.error {
  color: #9d2b2b;
}
</style>
