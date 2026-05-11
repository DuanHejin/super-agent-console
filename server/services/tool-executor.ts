import { getToolDefinition, type ToolName } from './tool-registry'
import { getToolWorkflowByToolName } from '../agent-config/workflows'

export async function executeTool(name: ToolName, args: unknown) {
  const tool = getToolDefinition(name)
  const workflow = getToolWorkflowByToolName(name)

  if (!tool || !tool.enabled) {
    throw new Error(`Tool ${name} is not enabled.`)
  }

  return {
    name,
    args,
    status: 'pending',
    workflowName: workflow?.name ?? tool.workflowName
  }
}
