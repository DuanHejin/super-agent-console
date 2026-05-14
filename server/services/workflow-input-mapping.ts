import type { ToolWorkflowStep } from '../agent-config'

/** 解析某个 workflow 步骤的 Skill 输入时可用的上下文。 */
interface ResolveWorkflowInputOptions {
  /** 从目标 Skill 输入字段到来源表达式的映射配置。 */
  inputMapping: ToolWorkflowStep['inputMapping']
  /** 原始 Tool 参数，可通过 `$toolArgs.xxx` 访问。 */
  toolArgs: Record<string, unknown>
  /** 已完成步骤的输出，可通过 `$steps.step-id.output` 访问。 */
  stepOutputs: Record<string, unknown>
}

/**
 * 根据 workflow 的 inputMapping 配置生成 Skill 输入对象。
 * 例如 `{ jdText: '$toolArgs.jdText' }` 会变成 `{ jdText: toolArgs.jdText }`。
 */
export function resolveWorkflowInput(options: ResolveWorkflowInputOptions) {
  const input: Record<string, unknown> = {}

  for (const [targetKey, sourcePath] of Object.entries(options.inputMapping)) {
    const value = resolvePath(sourcePath, options)

    if (value !== undefined) {
      input[targetKey] = value
    }
  }

  return input
}

/** 解析单个映射表达式，来源可以是 Tool 参数、前序步骤输出或普通字符串。 */
function resolvePath(sourcePath: string, options: ResolveWorkflowInputOptions) {
  if (sourcePath.startsWith('$toolArgs.')) {
    return getPathValue(options.toolArgs, sourcePath.slice('$toolArgs.'.length))
  }

  if (sourcePath.startsWith('$steps.')) {
    const [, stepId, ...restPath] = sourcePath.split('.')

    if (!stepId) {
      return undefined
    }

    const stepOutput = options.stepOutputs[stepId]
    const nestedPath = restPath.join('.')

    return nestedPath ? getPathValue(stepOutput, nestedPath) : stepOutput
  }

  return sourcePath
}

/** 普通对象的点路径读取器，例如 `a.b.c`。 */
function getPathValue(source: unknown, path: string) {
  if (!path) {
    return source
  }

  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return undefined
    }

    return (current as Record<string, unknown>)[key]
  }, source)
}
