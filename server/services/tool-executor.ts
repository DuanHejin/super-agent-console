import type { ToolName } from './tool-registry'

export async function executeTool(name: ToolName, args: unknown) {
  return {
    name,
    args,
    status: 'pending'
  }
}
