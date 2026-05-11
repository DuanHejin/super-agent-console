import type { SkillDefinition } from './types'

export const skillDefinitions = [
  {
    name: 'extractJobRequirementsSkill',
    displayName: 'Extract Job Requirements',
    description: 'Extract required skills, bonus skills, responsibilities, and risk points from a JD.',
    inputSchema: {
      type: 'object',
      properties: {
        jdText: {
          type: 'string',
          description: 'Raw job description text'
        },
        candidateProfile: {
          type: 'string',
          description: 'Optional candidate background for gap analysis'
        }
      },
      required: ['jdText']
    },
    outputSchema: {
      type: 'object',
      properties: {
        requiredSkills: {
          type: 'array',
          items: { type: 'string' }
        },
        bonusSkills: {
          type: 'array',
          items: { type: 'string' }
        },
        responsibilities: {
          type: 'array',
          items: { type: 'string' }
        },
        riskPoints: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['requiredSkills', 'bonusSkills', 'responsibilities', 'riskPoints']
    },
    execution: {
      mode: 'mock',
      handlerName: 'extractJobRequirements'
    }
  },
  {
    name: 'generateSevenDayPlanSkill',
    displayName: 'Generate Seven Day Plan',
    description: 'Generate a seven-day interview preparation plan from extracted job requirements.',
    inputSchema: {
      type: 'object',
      properties: {
        requirements: {
          type: 'object',
          description: 'Output from extractJobRequirementsSkill'
        },
        candidateProfile: {
          type: 'string',
          description: 'Optional candidate background for tailored preparation'
        }
      },
      required: ['requirements']
    },
    outputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              day: { type: 'integer' },
              focus: { type: 'string' },
              tasks: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['day', 'focus', 'tasks']
          }
        }
      },
      required: ['days']
    },
    execution: {
      mode: 'mock',
      handlerName: 'generateSevenDayPlan'
    }
  }
] as const satisfies readonly SkillDefinition[]

export type SkillName = (typeof skillDefinitions)[number]['name']

export function getSkillDefinition(name: string): SkillDefinition | undefined {
  return skillDefinitions.find((skill) => skill.name === name)
}
