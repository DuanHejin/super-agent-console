import { getAppRuntimeConfig } from '../utils/runtime-config'

export default defineEventHandler(() => {
  const config = getAppRuntimeConfig()

  return {
    status: 'ready',
    env: config.nodeEnv,
    version: config.appVersion,
    modelEnabled: config.modelEnabled,
    limits: {
      runRateLimitMinute: config.runRateLimitMinute,
      runRateLimitDay: config.runRateLimitDay,
      globalRunRateLimitMinute: config.globalRunRateLimitMinute,
      globalRunRateLimitDay: config.globalRunRateLimitDay,
      concurrentRunsPerUser: config.concurrentRunsPerUser,
      concurrentRunsGlobal: config.concurrentRunsGlobal,
      authLoginRateLimitMinute: config.authLoginRateLimitMinute,
      modelRequestTimeoutMs: config.modelRequestTimeoutMs,
      maxRunInputLength: config.maxRunInputLength
    },
    privateConfigLoaded: {
      databaseUrl: Boolean(config.databaseUrl),
      modelApiKey: Boolean(config.modelApiKey),
      accessCodes: config.accessCodes.split(',').map((code) => code.trim()).filter(Boolean).length,
      adminAccessCodes: config.adminAccessCodes.split(',').map((code) => code.trim()).filter(Boolean).length,
      authCookieSecret: Boolean(config.authCookieSecret)
    },
    configSource: 'env-or-nacos'
  }
})
