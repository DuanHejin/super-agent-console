<template>
  <section v-if="items.length" class="process-block">
    <h3>{{ title }}</h3>
    <dl>
      <div v-for="item in items" :key="item.label" class="data-row">
        <dt>{{ item.label }}</dt>
        <dd>
          <ul v-if="item.kind === 'list' && Array.isArray(item.value)">
            <li v-for="value in item.value" :key="value">{{ value }}</li>
          </ul>
          <pre v-else>{{ item.value }}</pre>
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import type { ProcessDataItem } from '../composables/useToolSkillProcess'

defineProps<{
  title: string
  items: ProcessDataItem[]
}>()
</script>

<style scoped>
.process-block {
  display: grid;
  gap: 8px;
}

h3 {
  margin: 0;
  color: #526068;
  font-size: 13px;
  letter-spacing: 0;
}

dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

.data-row {
  display: grid;
  gap: 4px;
}

dt {
  color: #526068;
  font-size: 12px;
}

dd {
  margin: 0;
  color: #172026;
}

ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
}

li {
  line-height: 1.55;
}

pre {
  overflow: auto;
  max-height: 180px;
  margin: 0;
  color: #172026;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
