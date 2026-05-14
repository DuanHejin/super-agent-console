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
