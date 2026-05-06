<template>
  <section class="panel">
    <h2>Input</h2>
    <textarea placeholder="粘贴岗位 JD 或输入测试文本" />
    <div class="actions">
      <button type="button">Mock Run</button>
      <button type="button">Real Run</button>
      <button type="button">Clear</button>
    </div>
  </section>
</template>

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
</style>
