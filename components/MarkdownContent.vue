<template>
  <div class="markdown-content" v-html="html"></div>
</template>

<script setup lang="ts">
import showdown from 'showdown'

const props = defineProps<{
  content: string
}>()

const converter = new showdown.Converter({
  ghCompatibleHeaderId: true,
  literalMidWordUnderscores: true,
  simpleLineBreaks: false,
  strikethrough: true,
  tables: true,
  tasklists: true
})

const html = computed(() => converter.makeHtml(stripRawHtml(props.content)))

function stripRawHtml(content: string) {
  return content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
</script>

<style scoped>
.markdown-content {
  color: #172026;
  line-height: 1.7;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(p),
.markdown-content :deep(ol),
.markdown-content :deep(ul),
.markdown-content :deep(table) {
  margin: 0 0 12px;
}

.markdown-content :deep(h1) {
  font-size: 20px;
}

.markdown-content :deep(h2) {
  font-size: 18px;
}

.markdown-content :deep(h3) {
  font-size: 17px;
}

.markdown-content :deep(h4) {
  font-size: 15px;
}

.markdown-content :deep(ol),
.markdown-content :deep(ul) {
  padding-left: 22px;
}

.markdown-content :deep(li + li) {
  margin-top: 6px;
}

.markdown-content :deep(hr) {
  margin: 18px 0;
  border: 0;
  border-top: 1px solid #dce3e6;
}

.markdown-content :deep(strong) {
  font-weight: 700;
}

.markdown-content :deep(code) {
  padding: 2px 4px;
  border-radius: 4px;
  background: #edf2f4;
  color: #1d5f7a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
}

.markdown-content :deep(pre) {
  overflow: auto;
  padding: 12px;
  border: 1px solid #dce3e6;
  border-radius: 6px;
  background: #f7f9fa;
}

.markdown-content :deep(pre code) {
  padding: 0;
  background: transparent;
}

.markdown-content :deep(blockquote) {
  margin: 0 0 12px;
  padding-left: 12px;
  border-left: 3px solid #dce3e6;
  color: #526068;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  padding: 8px;
  border: 1px solid #dce3e6;
  text-align: left;
}
</style>
