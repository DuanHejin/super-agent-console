export function getAppRuntimeConfig() {
    const config = useRuntimeConfig();

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
        modelApiKey:
            typeof config.modelApiKey === 'string'
                ? config.modelApiKey
                : undefined,
        modelEnabled: config.modelEnabled !== false,
        modelTemperature: Number(config.modelTemperature || 0.2),
        modelTopP: Number(config.modelTopP || 0.8),
        modelMaxTokens: Number(config.modelMaxTokens || 4096),
        demoServerToken: config.demoServerToken,
        accessCodes: String(config.accessCodes || ''),
        adminAccessCodes: String(config.adminAccessCodes || ''),
        authCookieSecret: String(config.authCookieSecret || ''),
        runRateLimitMinute: Number(config.runRateLimitMinute || 3),
        runRateLimitDay: Number(config.runRateLimitDay || 30),
        globalRunRateLimitMinute: Number(config.globalRunRateLimitMinute || 5),
        globalRunRateLimitDay: Number(config.globalRunRateLimitDay || 100),
        concurrentRunsPerUser: Number(config.concurrentRunsPerUser || 1),
        concurrentRunsGlobal: Number(config.concurrentRunsGlobal || 3),
        authLoginRateLimitMinute: Number(config.authLoginRateLimitMinute || 10),
        modelRequestTimeoutMs: Number(config.modelRequestTimeoutMs || 60000),
        maxRunInputLength: Number(config.maxRunInputLength || 5000),
        logLevel: config.logLevel,
        mockModelEnabled: config.mockModelEnabled,
    };
}
