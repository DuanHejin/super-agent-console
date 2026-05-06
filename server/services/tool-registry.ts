export const toolNames = ['parseJobDescription', 'generateInterviewPlan'] as const

export type ToolName = (typeof toolNames)[number]
