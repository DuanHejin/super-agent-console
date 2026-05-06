<template>
  <section class="panel">
    <h2>Timeline</h2>
    <ol>
      <li>等待 agent_start</li>
      <li>等待 tool_call_start</li>
      <li>等待 agent_done</li>
    </ol>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 12px;
  font-size: 18px;
  letter-spacing: 0;
}

ol {
  margin: 0;
  padding-left: 20px;
  color: #526068;
}
</style>
