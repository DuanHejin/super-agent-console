<template>
  <section class="panel">
    <header class="panel-header">
      <div>
        <h2>Tool / Skill Process</h2>
        <p v-if="status === 'running'">{{ phase?.label || '运行中' }}：{{ phase?.detail || 'Agent Run 正在执行。' }}</p>
        <p v-else>实时展示 Tool 参数、Skill 输入输出和 Tool 返回结果。</p>
      </div>
      <span v-if="status === 'running'" class="running-dot" aria-hidden="true"></span>
    </header>

    <div v-if="tools.length" class="tool-list">
      <article v-for="tool in tools" :key="tool.toolCallId" class="tool-item">
        <header class="tool-header">
          <div>
            <strong>{{ tool.toolName }}</strong>
            <small>{{ tool.toolCallId }}</small>
          </div>
          <span :class="['status-badge', tool.status]">{{ getStatusText(tool.status) }}</span>
        </header>

        <ProcessDataBlock title="Tool 参数" :items="tool.argItems" />
        <ProcessDataBlock title="Tool 过程输出" :items="tool.progressItems" />

        <ol v-if="tool.skills.length" class="skill-list">
          <li v-for="skill in tool.skills" :key="skill.skillRunId" class="skill-item">
            <header class="skill-header">
              <div>
                <strong>{{ skill.skillName }}</strong>
                <small>{{ skill.skillRunId }}</small>
              </div>
              <span :class="['status-badge', skill.status]">{{ getStatusText(skill.status) }}</span>
            </header>
            <ProcessDataBlock title="Skill 输入" :items="skill.inputItems" />
            <ProcessDataBlock title="Skill 过程输出" :items="skill.progressItems" />
            <ProcessDataBlock title="Skill 输出" :items="skill.resultItems" />
          </li>
        </ol>

        <ProcessDataBlock title="Tool 返回" :items="tool.resultItems" />
      </article>
    </div>

    <p v-else-if="status === 'running'" class="empty-state">模型正在分析，等待 Tool 调用事件。</p>
    <p v-else class="empty-state">等待 Agent Run 触发 Tool 调用。</p>
  </section>
</template>

<script setup lang="ts">
import type { ToolProcessView } from '../composables/useToolSkillProcess'
import type { AgentRunPhase } from '../composables/useAgentRun'

defineProps<{
  tools: ToolProcessView[]
  status: 'idle' | 'running' | 'success' | 'failed'
  phase?: AgentRunPhase
}>()

function getStatusText(status: ToolProcessView['status']) {
  return status === 'success' ? '已完成' : '执行中'
}
</script>

<style scoped>
.panel {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 1px solid #dce3e6;
  border-radius: 8px;
  background: #fff;
}

.panel-header,
.tool-header,
.skill-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

h2 {
  margin: 0 0 6px;
  font-size: 18px;
  letter-spacing: 0;
}

p {
  margin: 0;
  color: #526068;
}

.running-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  background: #2563eb;
  animation: pulse 1s ease-in-out infinite;
}

.status-badge.running::before {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border-radius: 999px;
  background: currentColor;
  content: "";
  animation: pulse 1s ease-in-out infinite;
}

.tool-list,
.skill-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tool-item,
.skill-item {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #dce3e6;
  border-radius: 8px;
  background: #f7f9fa;
}

.skill-item {
  background: #fff;
}

strong {
  display: block;
  color: #172026;
  font-size: 14px;
}

small {
  display: block;
  margin-top: 4px;
  color: #526068;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.status-badge {
  flex: 0 0 auto;
  padding: 3px 8px;
  border: 1px solid #b8c4c9;
  border-radius: 999px;
  color: #526068;
  font-size: 12px;
}

.status-badge.running {
  border-color: #9bb8f1;
  color: #1f4fa3;
}

.status-badge.success {
  border-color: #a8c9b8;
  color: #2f6b4f;
}

.empty-state {
  color: #526068;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
  }

  50% {
    opacity: 1;
  }
}
</style>
