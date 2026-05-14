<template>
  <div class="floating-actions">
    <button
      v-if="showBackTop"
      class="icon-button"
      type="button"
      aria-label="回到顶部"
      title="回到顶部"
      @click="scrollToTop"
    >
      ↑
    </button>
    <button class="feedback-button" type="button" @click="open = true">反馈</button>
  </div>

  <div v-if="open" class="feedback-mask" @click.self="open = false">
    <section class="feedback-panel">
      <header>
        <h2>反馈意见</h2>
        <button type="button" aria-label="关闭" @click="open = false">×</button>
      </header>

      <label for="feedback-content">你遇到的问题或建议</label>
      <textarea
        id="feedback-content"
        v-model="content"
        placeholder="比如：哪里不好用、哪里看不懂、希望增加什么能力。"
      />

      <label for="feedback-contact">联系方式，可选</label>
      <input id="feedback-contact" v-model="contact" placeholder="微信 / 邮箱 / 备注名">

      <div class="actions">
        <button type="button" :disabled="pending" @click="submitFeedback">
          {{ pending ? '提交中' : '提交反馈' }}
        </button>
        <button type="button" :disabled="pending" @click="open = false">取消</button>
      </div>

      <p v-if="message" :class="['message', messageType]">{{ message }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
const open = ref(false)
const content = ref('')
const contact = ref('')
const pending = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const showBackTop = ref(false)

function handleScroll() {
  showBackTop.value = window.scrollY > 480
}

onMounted(() => {
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => window.removeEventListener('scroll', handleScroll))

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

async function submitFeedback() {
  if (!content.value.trim()) {
    messageType.value = 'error'
    message.value = '请先填写反馈内容。'
    return
  }

  pending.value = true
  message.value = ''

  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: {
        content: content.value,
        contact: contact.value,
        pageUrl: window.location.href
      }
    })
    messageType.value = 'success'
    message.value = '已收到，感谢反馈。'
    content.value = ''
    contact.value = ''
  } catch {
    messageType.value = 'error'
    message.value = '提交失败，请稍后再试。'
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.floating-actions {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 20;
  display: grid;
  gap: 8px;
  justify-items: end;
}

.icon-button,
.feedback-button {
  border: 1px solid #c9d4d8;
  border-radius: 999px;
  background: #fff;
  color: #172026;
  box-shadow: 0 8px 22px rgb(23 32 38 / 12%);
  cursor: pointer;
  font: inherit;
}

.icon-button {
  width: 38px;
  height: 38px;
}

.feedback-button {
  padding: 9px 14px;
}

.feedback-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: end;
  padding: 20px;
  background: rgb(23 32 38 / 20%);
}

.feedback-panel {
  width: min(100%, 420px);
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid #dce3e6;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 40px rgb(23 32 38 / 18%);
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h2 {
  margin: 0;
  font-size: 18px;
}

header button {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 22px;
}

label {
  color: #526068;
  font-size: 13px;
}

textarea,
input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #c9d4d8;
  border-radius: 6px;
  font: inherit;
}

textarea {
  min-height: 120px;
  resize: vertical;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  padding: 8px 12px;
  border: 1px solid #c9d4d8;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.actions button:first-child {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.message {
  margin: 0;
  font-size: 13px;
}

.message.success {
  color: #2f6b4f;
}

.message.error {
  color: #9d2b2b;
}
</style>
