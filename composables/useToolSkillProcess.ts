import type { Ref } from 'vue'
import type { AgentEvent } from '../types/agent-event'

export interface ProcessDataItem {
  label: string
  value: string | string[]
  kind: 'text' | 'list'
}

export interface SkillProcessView {
  skillRunId: string
  skillName: string
  status: 'running' | 'success'
  inputItems: ProcessDataItem[]
  progressItems: ProcessDataItem[]
  resultItems: ProcessDataItem[]
  startedAt?: string
  finishedAt?: string
}

export interface ToolProcessView {
  toolCallId: string
  toolName: string
  status: 'running' | 'success'
  argItems: ProcessDataItem[]
  progressItems: ProcessDataItem[]
  resultItems: ProcessDataItem[]
  skills: SkillProcessView[]
  startedAt?: string
  finishedAt?: string
}

/** 将 Tool / Skill 相关 AgentEvent 转成前端可直接展示的过程视图。 */
export function useToolSkillProcess(events: Ref<AgentEvent[]>) {
  const toolProcesses = computed(() => buildToolSkillProcesses(events.value))

  return {
    toolProcesses
  }
}

export function buildToolSkillProcesses(events: AgentEvent[]): ToolProcessView[] {
  const tools = new Map<string, ToolProcessView>()

  for (const event of events) {
    if (event.eventType === 'tool_call_start') {
      const toolCallId = readString(event.data, 'toolCallId') || `tool_${event.sequence}`
      const toolName = readString(event.data, 'toolName') || event.name || 'unknownTool'
      const args = readRecord(event.data, 'args')

      tools.set(toolCallId, {
        toolCallId,
        toolName,
        status: 'running',
        argItems: toProcessDataItems(args),
        progressItems: [],
        resultItems: [],
        skills: [],
        startedAt: event.timestamp
      })
    }

    if (event.eventType === 'skill_start') {
      const toolCallId = readString(event.data, 'toolCallId') || `tool_${event.sequence}`
      const tool = getOrCreateToolProcess(tools, toolCallId, event)
      const skillRunId = readString(event.data, 'skillRunId') || `skill_${event.sequence}`
      const skillName = readString(event.data, 'skillName') || event.name || 'unknownSkill'
      const input = readRecord(event.data, 'input')
      const existingSkill = tool.skills.find((skill) => skill.skillRunId === skillRunId)

      if (existingSkill) {
        existingSkill.inputItems = toProcessDataItems(input)
        existingSkill.startedAt = event.timestamp
      } else {
        tool.skills.push({
          skillRunId,
          skillName,
          status: 'running',
          inputItems: toProcessDataItems(input),
          progressItems: [],
          resultItems: [],
          startedAt: event.timestamp
        })
      }
    }

    if (event.eventType === 'tool_progress_delta') {
      const toolCallId = readString(event.data, 'toolCallId') || `tool_${event.sequence}`
      const tool = getOrCreateToolProcess(tools, toolCallId, event)

      appendProgressDelta(tool.progressItems, event)
    }

    if (event.eventType === 'skill_progress_delta') {
      const toolCallId = readString(event.data, 'toolCallId') || `tool_${event.sequence}`
      const tool = getOrCreateToolProcess(tools, toolCallId, event)
      const skillRunId = readString(event.data, 'skillRunId') || `skill_${event.sequence}`
      const skillName = readString(event.data, 'skillName') || event.name || 'unknownSkill'
      const skill = getOrCreateSkillProcess(tool, skillRunId, skillName, event)

      appendProgressDelta(skill.progressItems, event)
    }

    if (event.eventType === 'skill_result') {
      const toolCallId = readString(event.data, 'toolCallId') || `tool_${event.sequence}`
      const tool = getOrCreateToolProcess(tools, toolCallId, event)
      const skillRunId = readString(event.data, 'skillRunId') || `skill_${event.sequence}`
      const skillName = readString(event.data, 'skillName') || event.name || 'unknownSkill'
      const result = readRecord(event.data, 'result')
      const existingSkill = tool.skills.find((skill) => skill.skillRunId === skillRunId)

      if (existingSkill) {
        existingSkill.status = 'success'
        existingSkill.resultItems = toProcessDataItems(result)
        existingSkill.finishedAt = event.timestamp
      } else {
        tool.skills.push({
          skillRunId,
          skillName,
          status: 'success',
          inputItems: [],
          progressItems: [],
          resultItems: toProcessDataItems(result),
          finishedAt: event.timestamp
        })
      }
    }

    if (event.eventType === 'tool_call_result') {
      const toolCallId = readString(event.data, 'toolCallId') || `tool_${event.sequence}`
      const tool = getOrCreateToolProcess(tools, toolCallId, event)
      const result = readRecord(event.data, 'result')
      const output = readRecord(result, 'output')
      const workflowName = readString(result, 'workflowName')

      tool.status = 'success'
      tool.resultItems = [
        ...(workflowName ? [{ label: 'Workflow', value: workflowName, kind: 'text' as const }] : []),
        ...toProcessDataItems(Object.keys(output).length ? output : result)
      ]
      tool.finishedAt = event.timestamp
    }
  }

  return Array.from(tools.values())
}

function getOrCreateToolProcess(
  tools: Map<string, ToolProcessView>,
  toolCallId: string,
  event: AgentEvent
) {
  const existingTool = tools.get(toolCallId)

  if (existingTool) {
    return existingTool
  }

  const fallbackTool: ToolProcessView = {
    toolCallId,
    toolName: readString(event.data, 'toolName') || event.name || 'unknownTool',
    status: 'running',
    argItems: [],
    progressItems: [],
    resultItems: [],
    skills: [],
    startedAt: event.timestamp
  }

  tools.set(toolCallId, fallbackTool)

  return fallbackTool
}

function getOrCreateSkillProcess(
  tool: ToolProcessView,
  skillRunId: string,
  skillName: string,
  event: AgentEvent
) {
  const existingSkill = tool.skills.find((skill) => skill.skillRunId === skillRunId)

  if (existingSkill) {
    return existingSkill
  }

  const fallbackSkill: SkillProcessView = {
    skillRunId,
    skillName,
    status: 'running',
    inputItems: [],
    progressItems: [],
    resultItems: [],
    startedAt: event.timestamp
  }

  tool.skills.push(fallbackSkill)

  return fallbackSkill
}

function toProcessDataItems(data: Record<string, unknown>): ProcessDataItem[] {
  return Object.entries(data)
    .filter(([, value]) => hasDisplayValue(value))
    .map(([key, value]) => ({
      label: getDisplayLabel(key),
      value: stringifyProcessValue(value),
      kind: Array.isArray(value) ? 'list' : 'text'
    }))
}

function stringifyProcessValue(value: unknown): string | string[] {
  if (Array.isArray(value)) {
    return value.map((item) => stringifySingleValue(item))
  }

  return stringifySingleValue(value)
}

function stringifySingleValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (value === null || value === undefined) {
    return ''
  }

  if (isRecord(value) && 'day' in value && 'focus' in value) {
    const tasks = Array.isArray(value.tasks) ? `：${value.tasks.map((task) => String(task)).join('；')}` : ''

    return `第 ${String(value.day)} 天，${String(value.focus)}${tasks}`
  }

  return JSON.stringify(value, null, 2)
}

function getDisplayLabel(key: string) {
  const labels: Record<string, string> = {
    jdText: '岗位 JD',
    candidateProfile: '候选人背景',
    requiredSkills: '必备技能',
    bonusSkills: '加分项',
    responsibilities: '职责',
    riskPoints: '风险点',
    days: '准备计划',
    workflowName: 'Workflow',
    output: '输出'
  }

  return labels[key] ?? key
}

function appendProgressDelta(items: ProcessDataItem[], event: AgentEvent) {
  const content = readString(event.data, 'content')

  if (!content) {
    return
  }

  const existingItem = items.find((item) => item.label === '过程输出')

  if (existingItem && typeof existingItem.value === 'string') {
    existingItem.value += content
    return
  }

  items.push({
    label: '过程输出',
    value: content,
    kind: 'text'
  })
}

function hasDisplayValue(value: unknown) {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  return true
}

function readRecord(data: unknown, key: string): Record<string, unknown> {
  if (!isRecord(data)) {
    return {}
  }

  const value = data[key]

  return isRecord(value) ? value : {}
}

function readString(data: unknown, key: string): string | undefined {
  if (!isRecord(data)) {
    return undefined
  }

  const value = data[key]

  return typeof value === 'string' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
