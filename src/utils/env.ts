export interface AppEnv {
  apiBaseUrl: string;
  apiToken?: string;
  apiTimeoutMs: number;
  port: number;
  nodeEnv: string;
  logLevel: string;
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const apiBaseUrl = env.MANTLE_YIELD_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    throw new Error("MANTLE_YIELD_API_BASE_URL is required");
  }

  const apiTimeoutMs = Number.parseInt(env.MANTLE_YIELD_API_TIMEOUT_MS ?? "10000", 10);
  if (!Number.isFinite(apiTimeoutMs) || apiTimeoutMs <= 0) {
    throw new Error("MANTLE_YIELD_API_TIMEOUT_MS must be a positive integer");
  }

  const port = Number.parseInt(env.PORT ?? "4001", 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
    apiToken: env.MANTLE_YIELD_API_TOKEN?.trim() || undefined,
    apiTimeoutMs,
    port,
    nodeEnv: env.NODE_ENV ?? "development",
    logLevel: env.LOG_LEVEL ?? "info",
  };
}
