import { getAppRuntimeConfig } from '../utils/runtime-config'

export default defineEventHandler(() => {
  const config = getAppRuntimeConfig()

  return {
    status: 'ready',
    env: config.nodeEnv,
    version: config.appVersion,
    modelEnabled: config.modelEnabled,
    configSource: 'env-or-nacos'
  }
})
