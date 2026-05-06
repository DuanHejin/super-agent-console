import { getAppRuntimeConfig } from '../utils/runtime-config'

export default defineEventHandler(() => {
  const config = getAppRuntimeConfig()

  return {
    status: 'ready',
    env: config.nodeEnv,
    version: config.appVersion,
    configSource: 'env-or-nacos'
  }
})
