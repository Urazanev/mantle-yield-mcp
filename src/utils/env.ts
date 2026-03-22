export interface AppEnv {
  apiBaseUrl: string;
  apiToken?: string;
  apiTimeoutMs: number;
  logLevel: string;
}

const DEFAULT_API_BASE_URL = "https://mantle-yield.asterworks.cc";

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const apiBaseUrl = (env.MANTLE_YIELD_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

  const apiTimeoutMs = Number.parseInt(env.MANTLE_YIELD_API_TIMEOUT_MS ?? "10000", 10);
  const resolvedTimeout = Number.isFinite(apiTimeoutMs) && apiTimeoutMs > 0 ? apiTimeoutMs : 10000;

  const apiToken = env.MANTLE_YIELD_API_TOKEN?.trim() || undefined;
  const logLevel = env.LOG_LEVEL?.trim() || "silent";

  return {
    apiBaseUrl,
    apiTimeoutMs: resolvedTimeout,
    apiToken,
    logLevel,
  };
}
