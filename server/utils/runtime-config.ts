export function getAppRuntimeConfig() {
  const config = useRuntimeConfig()

  return {
    appName: config.public.appName,
    appVersion: config.public.appVersion,
    deployEnv: config.public.deployEnv,
    configDemoText: config.public.configDemoText,
    siteUrl: config.public.siteUrl,
    nodeEnv: config.public.nodeEnv,
    databaseUrl: config.databaseUrl,
    modelProvider: String(config.modelProvider || 'mock'),
    modelName: String(config.modelName || ''),
    modelBaseUrl: String(config.modelBaseUrl || ''),
    modelApiKey: typeof config.modelApiKey === 'string' ? config.modelApiKey : undefined,
    modelTemperature: Number(config.modelTemperature || 0.2),
    modelTopP: Number(config.modelTopP || 0.8),
    modelMaxTokens: Number(config.modelMaxTokens || 4096),
    demoServerToken: config.demoServerToken,
    logLevel: config.logLevel,
    mockModelEnabled: config.mockModelEnabled
  }
}
