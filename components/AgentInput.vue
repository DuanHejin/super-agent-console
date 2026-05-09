<template>
  <section class="panel">
    <h2>Input</h2>
    <textarea
      :disabled="disabled"
      :value="modelValue"
      placeholder="粘贴岗位 JD 或输入测试文本"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div class="actions">
      <button type="button" :disabled="disabled" @click="emit('mockRun')">Mock Run</button>
      <button type="button" disabled>Real Run</button>
      <button type="button" :disabled="disabled" @click="emit('clear')">Clear</button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  mockRun: []
  clear: []
}>()
</script>

<style scoped>
.panel {
  display: grid;
  gap: 12px;
}

h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
}

textarea {
  min-height: 160px;
  padding: 12px;
  border: 1px solid #dce3e6;
  border-radius: 8px;
  resize: vertical;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

button {
  padding: 8px 12px;
  border: 1px solid #b8c4c9;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

button:disabled,
textarea:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
