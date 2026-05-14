export function getAppRuntimeConfig() {
  const config = useRuntimeConfig()

  return {
    appName: config.public.appName,
    appVersion: config.public.appVersion,
    deployEnv: config.public.deployEnv,
    configDemoText: config.public.configDemoText,
    siteUrl: config.public.siteUrl,
    nodeEnv: process.env.NODE_ENV || config.public.nodeEnv,
    databaseUrl: readRuntimeString('DATABASE_URL', config.databaseUrl),
    modelProvider: readRuntimeString('MODEL_PROVIDER', config.modelProvider, 'mock'),
    modelName: readRuntimeString('MODEL_NAME', config.modelName),
    modelBaseUrl: readRuntimeString('MODEL_BASE_URL', config.modelBaseUrl),
    modelApiKey: readRuntimeString('MODEL_API_KEY', config.modelApiKey) || undefined,
    modelEnabled: readRuntimeBoolean('MODEL_ENABLED', config.modelEnabled, true),
    modelTemperature: readRuntimeNumber('MODEL_TEMPERATURE', config.modelTemperature, 0.2),
    modelTopP: readRuntimeNumber('MODEL_TOP_P', config.modelTopP, 0.8),
    modelMaxTokens: readRuntimeNumber('MODEL_MAX_TOKENS', config.modelMaxTokens, 4096),
    demoServerToken: readRuntimeString('DEMO_SERVER_TOKEN', config.demoServerToken),
    accessCodes: readRuntimeString('ACCESS_CODES', config.accessCodes),
    adminAccessCodes: readRuntimeString('ADMIN_ACCESS_CODES', config.adminAccessCodes),
    authCookieSecret: readRuntimeString('AUTH_COOKIE_SECRET', config.authCookieSecret),
    runRateLimitMinute: readRuntimeNumber('RUN_RATE_LIMIT_MINUTE', config.runRateLimitMinute, 3),
    runRateLimitDay: readRuntimeNumber('RUN_RATE_LIMIT_DAY', config.runRateLimitDay, 30),
    globalRunRateLimitMinute: readRuntimeNumber('GLOBAL_RUN_RATE_LIMIT_MINUTE', config.globalRunRateLimitMinute, 5),
    globalRunRateLimitDay: readRuntimeNumber('GLOBAL_RUN_RATE_LIMIT_DAY', config.globalRunRateLimitDay, 100),
    concurrentRunsPerUser: readRuntimeNumber('CONCURRENT_RUNS_PER_USER', config.concurrentRunsPerUser, 1),
    concurrentRunsGlobal: readRuntimeNumber('CONCURRENT_RUNS_GLOBAL', config.concurrentRunsGlobal, 3),
    authLoginRateLimitMinute: readRuntimeNumber('AUTH_LOGIN_RATE_LIMIT_MINUTE', config.authLoginRateLimitMinute, 10),
    modelRequestTimeoutMs: readRuntimeNumber('MODEL_REQUEST_TIMEOUT_MS', config.modelRequestTimeoutMs, 60000),
    maxRunInputLength: readRuntimeNumber('MAX_RUN_INPUT_LENGTH', config.maxRunInputLength, 5000),
    logLevel: readRuntimeString('LOG_LEVEL', config.logLevel, 'info'),
    mockModelEnabled: readRuntimeBoolean('MOCK_MODEL_ENABLED', config.mockModelEnabled, true)
  }
}

function readRuntimeString(envKey: string, configValue: unknown, fallback = '') {
  return process.env[envKey] || process.env[`NUXT_${envKey}`] || String(configValue || fallback)
}

function readRuntimeNumber(envKey: string, configValue: unknown, fallback: number) {
  const rawValue = readRuntimeString(envKey, configValue, String(fallback))
  const parsed = Number(rawValue)

  return Number.isFinite(parsed) ? parsed : fallback
}

function readRuntimeBoolean(envKey: string, configValue: unknown, fallback: boolean) {
  const rawValue = process.env[envKey] || process.env[`NUXT_${envKey}`]

  if (rawValue === 'true') {
    return true
  }

  if (rawValue === 'false') {
    return false
  }

  if (typeof configValue === 'boolean') {
    return configValue
  }

  return fallback
}
