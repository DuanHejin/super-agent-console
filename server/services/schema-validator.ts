import type { JsonSchema } from '../agent-config'

/** MVP schema 校验器返回的结果对象。 */
export interface SchemaValidationResult {
  /** 没有收集到任何校验错误时为 true。 */
  valid: boolean
  /** 可读错误列表，包含类似 `tool.foo.args.jdText` 的路径。 */
  errors: string[]
}

/**
 * 使用项目内的轻量 JsonSchema 子集校验一个值。
 * 用于 Tool 参数校验，以及 Skill 输入/输出校验。
 */
export function validateJsonSchema(schema: JsonSchema, value: unknown, path = 'value'): SchemaValidationResult {
  const errors: string[] = []

  validate(schema, value, path, errors)

  return {
    valid: errors.length === 0,
    errors
  }
}

/** 递归校验基础类型、对象、数组和 enum。 */
function validate(schema: JsonSchema, value: unknown, path: string, errors: string[]) {
  if (schema.enum && !schema.enum.includes(String(value))) {
    errors.push(`${path} must be one of: ${schema.enum.join(', ')}`)
    return
  }

  if (!matchesType(schema.type, value)) {
    errors.push(`${path} must be ${schema.type}`)
    return
  }

  if (schema.type === 'object') {
    validateObject(schema, value as Record<string, unknown>, path, errors)
    return
  }

  if (schema.type === 'array' && schema.items) {
    ;(value as unknown[]).forEach((item, index) => {
      validate(schema.items as JsonSchema, item, `${path}[${index}]`, errors)
    })
  }
}

/** 校验对象必填字段和嵌套字段。 */
function validateObject(
  schema: JsonSchema,
  value: Record<string, unknown>,
  path: string,
  errors: string[]
) {
  for (const key of schema.required ?? []) {
    if (!(key in value) || value[key] === undefined) {
      errors.push(`${path}.${key} is required`)
    }
  }

  for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
    if (!(key in value) || value[key] === undefined) {
      continue
    }

    validate(propertySchema, value[key], `${path}.${key}`, errors)
  }
}

/** 校验项目当前 JsonSchemaType 子集对应的运行时类型。 */
function matchesType(type: JsonSchema['type'], value: unknown) {
  if (type === 'array') {
    return Array.isArray(value)
  }

  if (type === 'integer') {
    return Number.isInteger(value)
  }

  if (type === 'object') {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  return typeof value === type
}
