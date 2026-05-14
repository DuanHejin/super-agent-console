<template>
  <main class="list-page">
    <nav class="page-nav">
      <NuxtLink to="/">控制台</NuxtLink>
      <NuxtLink to="/runs">Run 列表</NuxtLink>
      <NuxtLink to="/conversations">Conversation 列表</NuxtLink>
    </nav>

    <section class="panel">
      <div class="heading-row">
        <div>
          <h1>Feedback 列表</h1>
          <p>查看朋友试用后的反馈、昵称、联系方式和提交页面。</p>
        </div>
        <button type="button" @click="refresh()">刷新</button>
      </div>

      <p v-if="pending">正在加载 Feedback 列表。</p>
      <p v-else-if="error" class="error">Feedback 列表加载失败：{{ error.message }}</p>
      <div v-else-if="feedbacks.length" class="feedback-list">
        <article v-for="feedback in feedbacks" :key="feedback.id" class="feedback-card">
          <header>
            <div>
              <strong>{{ feedback.nickname || feedback.userId || '匿名用户' }}</strong>
              <small>{{ formatLocalDateTime(feedback.createdAt) }}</small>
            </div>
            <span v-if="feedback.contact">{{ feedback.contact }}</span>
          </header>

          <p class="content">{{ feedback.content }}</p>

          <dl>
            <template v-if="feedback.pageUrl">
              <dt>page</dt>
              <dd>
                <a :href="feedback.pageUrl" target="_blank" rel="noreferrer">{{ feedback.pageUrl }}</a>
              </dd>
            </template>
            <template v-if="feedback.userAgent">
              <dt>ua</dt>
              <dd>{{ feedback.userAgent }}</dd>
            </template>
          </dl>
        </article>
      </div>
      <p v-else>暂无 Feedback。</p>
    </section>
  </main>
</template>

<script setup lang="ts">
interface FeedbackListItem {
  id: string
  userId?: string
  nickname?: string
  content: string
  contact?: string
  pageUrl?: string
  userAgent?: string
  createdAt: string
}

const { formatLocalDateTime } = useLocalDateTime()
const { data: authStatus } = await useFetch<{ authenticated: boolean, userId?: string, isAdmin: boolean }>('/api/auth/me')

if (!import.meta.dev && !authStatus.value?.isAdmin) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
}

const { data, pending, error, refresh } = await useFetch<{ items: FeedbackListItem[] }>('/api/feedback')
const feedbacks = computed(() => data.value?.items ?? [])
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
a {
  color: #2563eb;
  text-decoration: none;
}

.panel,
.feedback-card {
  border: 1px solid #dce3e6;
  border-radius: 8px;
  background: #fff;
}

.panel {
  padding: 20px;
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

.feedback-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.feedback-card {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.feedback-card header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: flex-start;
  justify-content: space-between;
}

strong,
small {
  display: block;
}

small,
span,
dt {
  color: #526068;
  font-size: 12px;
}

.content {
  color: #172026;
  line-height: 1.7;
  white-space: pre-wrap;
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 10px;
  margin: 0;
}

dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: #526068;
  font-size: 12px;
}

.error {
  color: #9d2b2b;
}
</style>
