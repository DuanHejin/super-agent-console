import { getAppRuntimeConfig } from '../utils/runtime-config'

export default defineEventHandler(() => {
  const config = getAppRuntimeConfig()

  return {
    publicConfig: {
      appName: config.appName,
      appVersion: config.appVersion,
      deployEnv: config.deployEnv,
      configDemoText: config.configDemoText,
      siteUrl: config.siteUrl,
      nodeEnv: config.nodeEnv
    },
    serverOnlyConfig: {
      arkBaseUrl: config.arkBaseUrl,
      arkModelId: config.arkModelId,
      logLevel: config.logLevel,
      mockModelEnabled: config.mockModelEnabled,
      databaseUrlLoaded: Boolean(config.databaseUrl),
      arkApiKeyLoaded: Boolean(config.arkApiKey),
      demoServerTokenLoaded: Boolean(config.demoServerToken)
    }
  }
})
