<template>
  <div class="markdown-content">
    <template v-for="(block, blockIndex) in blocks" :key="`${block.type}-${blockIndex}`">
      <hr v-if="block.type === 'hr'">
      <h3 v-else-if="block.type === 'h3'">
        <MarkdownInline :segments="getBlockSegments(block)" />
      </h3>
      <h4 v-else-if="block.type === 'h4'">
        <MarkdownInline :segments="getBlockSegments(block)" />
      </h4>
      <ol v-else-if="block.type === 'ol'">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <MarkdownInline :segments="item" />
        </li>
      </ol>
      <ul v-else-if="block.type === 'ul'">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <MarkdownInline :segments="item" />
        </li>
      </ul>
      <p v-else>
        <MarkdownInline :segments="getBlockSegments(block)" />
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h, computed } from 'vue'

interface InlineSegment {
  type: 'text' | 'strong' | 'code'
  text: string
}

type MarkdownBlock =
  | {
      type: 'p' | 'h3' | 'h4'
      segments: InlineSegment[]
    }
  | {
      type: 'ol' | 'ul'
      items: InlineSegment[][]
    }
  | {
      type: 'hr'
    }

const props = defineProps<{
  content: string
}>()

const MarkdownInline = defineComponent({
  props: {
    segments: {
      type: Array as () => InlineSegment[],
      required: true
    }
  },
  setup(inlineProps) {
    return () =>
      inlineProps.segments.map((segment, index) => {
        if (segment.type === 'strong') {
          return h('strong', { key: index }, segment.text)
        }

        if (segment.type === 'code') {
          return h('code', { key: index }, segment.text)
        }

        return h('span', { key: index }, segment.text)
      })
  }
})

const blocks = computed(() => parseMarkdown(props.content))

function getBlockSegments(block: MarkdownBlock) {
  return 'segments' in block ? block.segments : []
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const result: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]?.trimEnd() ?? ''

    if (!line.trim()) {
      index += 1
      continue
    }

    if (/^-{3,}$/.test(line.trim())) {
      result.push({ type: 'hr' })
      index += 1
      continue
    }

    if (line.startsWith('#### ')) {
      result.push({
        type: 'h4',
        segments: parseInline(line.slice(5).trim())
      })
      index += 1
      continue
    }

    if (line.startsWith('### ')) {
      result.push({
        type: 'h3',
        segments: parseInline(line.slice(4).trim())
      })
      index += 1
      continue
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const items: InlineSegment[][] = []

      while (index < lines.length && /^\d+\.\s+/.test((lines[index] ?? '').trim())) {
        items.push(parseInline((lines[index] ?? '').trim().replace(/^\d+\.\s+/, '')))
        index += 1
      }

      result.push({
        type: 'ol',
        items
      })
      continue
    }

    if (/^[-*]\s+/.test(line.trim())) {
      const items: InlineSegment[][] = []

      while (index < lines.length && /^[-*]\s+/.test((lines[index] ?? '').trim())) {
        items.push(parseInline((lines[index] ?? '').trim().replace(/^[-*]\s+/, '')))
        index += 1
      }

      result.push({
        type: 'ul',
        items
      })
      continue
    }

    const paragraphLines = [line.trim()]
    index += 1

    while (index < lines.length && shouldContinueParagraph(lines[index] ?? '')) {
      paragraphLines.push((lines[index] ?? '').trim())
      index += 1
    }

    result.push({
      type: 'p',
      segments: parseInline(paragraphLines.join('\n'))
    })
  }

  return result
}

function shouldContinueParagraph(line: string) {
  const trimmed = line.trim()

  return Boolean(trimmed)
    && !/^-{3,}$/.test(trimmed)
    && !trimmed.startsWith('### ')
    && !trimmed.startsWith('#### ')
    && !/^\d+\.\s+/.test(trimmed)
    && !/^[-*]\s+/.test(trimmed)
}

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let lastIndex = 0
  let match = pattern.exec(text)

  while (match) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        text: text.slice(lastIndex, match.index)
      })
    }

    const token = match[0]

    if (token.startsWith('**')) {
      segments.push({
        type: 'strong',
        text: token.slice(2, -2)
      })
    } else {
      segments.push({
        type: 'code',
        text: token.slice(1, -1)
      })
    }

    lastIndex = match.index + token.length
    match = pattern.exec(text)
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      text: text.slice(lastIndex)
    })
  }

  return segments
}
</script>

<style scoped>
.markdown-content {
  color: #172026;
  line-height: 1.7;
}

h3,
h4,
p,
ol,
ul {
  margin: 0 0 12px;
}

h3 {
  font-size: 17px;
}

h4 {
  font-size: 15px;
}

ol,
ul {
  padding-left: 22px;
}

li + li {
  margin-top: 6px;
}

hr {
  margin: 18px 0;
  border: 0;
  border-top: 1px solid #dce3e6;
}

strong {
  font-weight: 700;
}

code {
  padding: 2px 4px;
  border-radius: 4px;
  background: #edf2f4;
  color: #1d5f7a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
}
</style>
