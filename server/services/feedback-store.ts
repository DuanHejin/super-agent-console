import { prisma } from '../utils/prisma'
import { createFeedbackId } from '../utils/ids'

export interface CreateFeedbackOptions {
  userId?: string
  nickname?: string
  content: string
  contact?: string
  pageUrl?: string
  userAgent?: string
}

export interface FeedbackListItem {
  id: string
  userId?: string
  nickname?: string
  content: string
  contact?: string
  pageUrl?: string
  userAgent?: string
  createdAt: string
}

export async function createFeedback(options: CreateFeedbackOptions) {
  const id = createFeedbackId()

  await prisma.feedback.create({
    data: {
      id,
      userId: options.userId,
      nickname: options.nickname,
      content: options.content,
      contact: options.contact,
      pageUrl: options.pageUrl,
      userAgent: options.userAgent
    }
  })

  return {
    id
  }
}

export async function listFeedbacks(limit = 50): Promise<FeedbackListItem[]> {
  const feedbacks = await prisma.feedback.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  })

  return feedbacks.map((feedback) => ({
    id: feedback.id,
    userId: feedback.userId ?? undefined,
    nickname: feedback.nickname ?? undefined,
    content: feedback.content,
    contact: feedback.contact ?? undefined,
    pageUrl: feedback.pageUrl ?? undefined,
    userAgent: feedback.userAgent ?? undefined,
    createdAt: feedback.createdAt.toISOString()
  }))
}
