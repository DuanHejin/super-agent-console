<template>
  <main class="login-page">
    <section class="login-panel">
      <p class="eyebrow">Super Agent Console</p>
      <h1>访问验证</h1>
      <p class="intro">输入访问码后即可进入 Agent Console。</p>

      <form @submit.prevent="login">
        <label for="access-code">访问码</label>
        <input
          id="access-code"
          v-model="accessCode"
          type="password"
          autocomplete="current-password"
          placeholder="请输入访问码"
        >

        <label for="nickname">昵称，可选</label>
        <input
          id="nickname"
          v-model="nickname"
          type="text"
          autocomplete="nickname"
          maxlength="40"
          placeholder="方便我知道是哪位朋友"
        >

        <button type="submit" :disabled="pending">
          {{ pending ? '验证中' : '进入控制台' }}
        </button>
      </form>

      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
const route = useRoute()
const accessCode = ref('')
const nickname = ref('')
const pending = ref(false)
const error = ref('')

async function login() {
  pending.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        accessCode: accessCode.value,
        nickname: nickname.value
      }
    })

    await navigateTo(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
  } catch {
    error.value = '访问码不正确。'
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: #f5f7f8;
  color: #172026;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.login-panel {
  width: min(100%, 420px);
  padding: 24px;
  border: 1px solid #dce3e6;
  border-radius: 8px;
  background: #fff;
}

.eyebrow {
  margin: 0 0 10px;
  color: #3d6b5c;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 28px;
  letter-spacing: 0;
}

.intro {
  margin: 12px 0 20px;
  color: #526068;
}

form {
  display: grid;
  gap: 10px;
}

label {
  color: #526068;
  font-size: 13px;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #c9d4d8;
  border-radius: 6px;
  font: inherit;
}

button {
  padding: 10px 12px;
  border: 0;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  font: inherit;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.error {
  margin: 14px 0 0;
  color: #9d2b2b;
}
</style>
