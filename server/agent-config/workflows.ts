import type { ToolWorkflowDefinition } from './types'

export const toolWorkflowDefinitions = [
  {
    name: 'jobInterviewPreparationWorkflow',
    toolName: 'analyzeJobAndGeneratePlan',
    description: 'Analyze a JD, then generate a seven-day interview preparation plan.',
    steps: [
      {
        id: 'extract-requirements',
        skillName: 'extractJobRequirementsSkill',
        inputMapping: {
          jdText: '$toolArgs.jdText',
          candidateProfile: '$toolArgs.candidateProfile'
        }
      },
      {
        id: 'generate-plan',
        skillName: 'generateSevenDayPlanSkill',
        inputMapping: {
          requirements: '$steps.extract-requirements.output',
          candidateProfile: '$toolArgs.candidateProfile'
        }
      }
    ]
  },
  {
    name: 'parseJobDescriptionWorkflow',
    toolName: 'parseJobDescription',
    description: 'Compatibility workflow for the early mock JD parsing tool.',
    steps: [
      {
        id: 'extract-requirements',
        skillName: 'extractJobRequirementsSkill',
        inputMapping: {
          jdText: '$toolArgs.jdText'
        }
      }
    ]
  },
  {
    name: 'generateInterviewPlanWorkflow',
    toolName: 'generateInterviewPlan',
    description: 'Compatibility workflow for the early mock interview plan tool.',
    steps: [
      {
        id: 'generate-plan',
        skillName: 'generateSevenDayPlanSkill',
        inputMapping: {
          requirements: '$toolArgs.requirements'
        }
      }
    ]
  }
] as const satisfies readonly ToolWorkflowDefinition[]

export function getToolWorkflowDefinition(name: string): ToolWorkflowDefinition | undefined {
  return toolWorkflowDefinitions.find((workflow) => workflow.name === name)
}

export function getToolWorkflowByToolName(toolName: string): ToolWorkflowDefinition | undefined {
  return toolWorkflowDefinitions.find((workflow) => workflow.toolName === toolName)
}
