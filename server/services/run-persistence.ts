import type { Prisma } from '@prisma/client'
import type { AgentEvent } from '../../types/agent-event'
import type { AgentRunDetailResponse, AgentRunStatus } from '../../types/agent-run'
import type { AgentRunRecord } from './run-store'
import { prisma } from '../utils/prisma'

/** 将运行时对象转换为 Prisma JSON 可写入结构。 */
function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
}

/** 将数据库 JSON 字段恢复成前端事件 data。 */
function fromJsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

/** 从事件 data 里读取字符串字段。 */
function readString(data: unknown, key: string) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === 'string' ? value : undefined
}

/** 从事件 data 里读取对象字段。 */
function readRecord(data: unknown, key: string): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {}
  }

  const value = (data as Record<string, unknown>)[key]

  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

/** 数据库层创建 conversation、message、run 和幂等记录。 */
export async function createPersistedMessageRun(run: AgentRunRecord, idempotent = false) {
  const response = {
    conversationId: run.conversationId,
    messageId: run.messageId,
    runId: run.runId,
    traceId: run.traceId,
    status: run.status,
    idempotent
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversation.upsert({
      where: {
        id: run.conversationId
      },
      create: {
        id: run.conversationId,
        title: run.input.slice(0, 80) || '新会话'
      },
      update: {}
    })

    await tx.message.upsert({
      where: {
        id: run.messageId
      },
      create: {
        id: run.messageId,
        conversationId: run.conversationId,
        role: 'user',
        content: run.input
      },
      update: {
        content: run.input
      }
    })

    await tx.agentRun.upsert({
      where: {
        id: run.runId
      },
      create: {
        id: run.runId,
        conversationId: run.conversationId,
        messageId: run.messageId,
        traceId: run.traceId,
        status: run.status,
        input: run.input
      },
      update: {
        status: run.status,
        input: run.input
      }
    })

    await tx.idempotencyRecord.upsert({
      where: {
        userId_clientRequestId: {
          userId: run.userId,
          clientRequestId: run.clientRequestId
        }
      },
      create: {
        userId: run.userId,
        clientRequestId: run.clientRequestId,
        conversationId: run.conversationId,
        messageId: run.messageId,
        runId: run.runId,
        response: toJsonObject(response)
      },
      update: {
        response: toJsonObject(response)
      }
    })
  })
}

/** 更新持久化 AgentRun 的状态。 */
export async function updatePersistedRunStatus(runId: string, status: AgentRunStatus) {
  await prisma.agentRun.update({
    where: {
      id: runId
    },
    data: {
      status,
      startedAt: status === 'running' ? new Date() : undefined
    }
  })
}

/** 将单条 AgentEvent 落库，并按事件类型维护 ToolCall / SkillRun。 */
export async function persistAgentEvent(event: AgentEvent) {
  const toolCallId = readString(event.data, 'toolCallId')
  const skillRunId = readString(event.data, 'skillRunId')

  await prisma.$transaction(async (tx) => {
    if (event.eventType === 'tool_call_start' && toolCallId) {
      await tx.toolCall.upsert({
        where: {
          id: toolCallId
        },
        create: {
          id: toolCallId,
          toolCallId,
          runId: event.runId,
          traceId: event.traceId,
          toolName: readString(event.data, 'toolName') || event.name || 'unknownTool',
          arguments: toJsonObject(readRecord(event.data, 'args')),
          status: 'running',
          startedAt: new Date(event.timestamp)
        },
        update: {
          status: 'running',
          startedAt: new Date(event.timestamp)
        }
      })
    }

    if (event.eventType === 'skill_start' && skillRunId) {
      await tx.skillRun.upsert({
        where: {
          id: skillRunId
        },
        create: {
          id: skillRunId,
          skillRunId,
          runId: event.runId,
          toolCallId,
          traceId: event.traceId,
          stepId: readString(event.data, 'stepId') || 'unknown-step',
          skillName: readString(event.data, 'skillName') || event.name || 'unknownSkill',
          input: toJsonObject(readRecord(event.data, 'input')),
          status: 'running',
          startedAt: new Date(event.timestamp)
        },
        update: {
          status: 'running',
          startedAt: new Date(event.timestamp)
        }
      })
    }

    await tx.agentEvent.upsert({
      where: {
        eventId: event.eventId
      },
      create: {
        id: event.eventId,
        eventId: event.eventId,
        runId: event.runId,
        toolCallId,
        skillRunId,
        conversationId: event.conversationId,
        messageId: event.messageId,
        traceId: event.traceId,
        eventType: event.eventType,
        sequence: event.sequence,
        status: event.status,
        name: event.name,
        message: event.message,
        data: toJsonObject(event.data),
        timestamp: new Date(event.timestamp)
      },
      update: {
        status: event.status,
        data: toJsonObject(event.data)
      }
    })

    if (event.eventType === 'tool_call_result' && toolCallId) {
      const result = readRecord(event.data, 'result')

      await tx.toolCall.update({
        where: {
          id: toolCallId
        },
        data: {
          result: toJsonObject(result),
          status: 'completed',
          completedAt: new Date(event.timestamp)
        }
      })
    }

    if (event.eventType === 'skill_result' && skillRunId) {
      const result = readRecord(event.data, 'result')

      await tx.skillRun.update({
        where: {
          id: skillRunId
        },
        data: {
          result: toJsonObject(result),
          status: 'completed',
          completedAt: new Date(event.timestamp)
        }
      })
    }

    await tx.agentRun.update({
      where: {
        id: event.runId
      },
      data: {
        status: event.status
      }
    })
  })
}

/** Agent Run 完成时写入最终答案和完成时间。 */
export async function completePersistedMessageRun(runId: string, finalAnswer: string) {
  await prisma.agentRun.update({
    where: {
      id: runId
    },
    data: {
      status: 'completed',
      finalAnswer,
      completedAt: new Date()
    }
  })
}

/** 从数据库读取 Run 详情，用于详情页和后续 replay。 */
export async function getPersistedRunDetail(runId: string): Promise<AgentRunDetailResponse | undefined> {
  const run = await prisma.agentRun.findUnique({
    where: {
      id: runId
    },
    include: {
      events: {
        orderBy: {
          sequence: 'asc'
        }
      }
    }
  })

  if (!run) {
    return undefined
  }

  return {
    conversationId: run.conversationId,
    messageId: run.messageId,
    runId: run.id,
    traceId: run.traceId,
    status: run.status,
    input: run.input,
    events: run.events.map((event): AgentEvent => ({
      eventId: event.eventId,
      eventType: event.eventType as AgentEvent['eventType'],
      conversationId: event.conversationId,
      messageId: event.messageId,
      runId: event.runId,
      traceId: event.traceId,
      sequence: event.sequence,
      status: event.status,
      timestamp: event.timestamp.toISOString(),
      name: event.name ?? undefined,
      data: fromJsonObject(event.data),
      message: event.message ?? undefined
    })),
    finalAnswer: run.finalAnswer ?? undefined,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString()
  }
}
