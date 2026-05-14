import type { ToolDefinition } from './types'

export const toolDefinitions = [
  {
    name: 'analyzeJobAndGeneratePlan',
    displayName: 'Analyze Job And Generate Plan',
    description: 'Analyze a job description and generate a seven-day interview preparation plan.',
    enabled: true,
    workflowName: 'jobInterviewPreparationWorkflow',
    parameters: {
      type: 'object',
      properties: {
        jdText: {
          type: 'string',
          description: 'Raw job description text to analyze'
        },
        candidateProfile: {
          type: 'string',
          description: 'Optional candidate background for tailored preparation'
        }
      },
      required: ['jdText']
    }
  },
  {
    name: 'parseJobDescription',
    displayName: 'Parse Job Description',
    description: 'Legacy MVP tool that extracts basic JD information for the current mock Agent flow.',
    enabled: true,
    workflowName: 'parseJobDescriptionWorkflow',
    parameters: {
      type: 'object',
      properties: {
        jdText: {
          type: 'string',
          description: 'Raw job description text'
        }
      },
      required: ['jdText']
    }
  },
  {
    name: 'generateInterviewPlan',
    displayName: 'Generate Interview Plan',
    description: 'Legacy MVP tool that generates an interview preparation plan from parsed JD data.',
    enabled: true,
    workflowName: 'generateInterviewPlanWorkflow',
    parameters: {
      type: 'object',
      properties: {
        requirements: {
          type: 'object',
          description: 'Parsed job requirements'
        }
      },
      required: ['requirements']
    }
  }
] as const satisfies readonly ToolDefinition[]

export type ToolName = (typeof toolDefinitions)[number]['name']

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return toolDefinitions.find((tool) => tool.name === name)
}

export function isToolName(name: string): name is ToolName {
  return toolDefinitions.some((tool) => tool.name === name)
}
