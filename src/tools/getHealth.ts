import type { MantleYieldApiClient } from "../client/apiClient.js";

/**
 * mantle_get_health — GET /api/health
 *
 * Returns the raw health data from the backend.
 *
 * Backend gap note:
 * The spec describes fields: syncedAt, nextRefresh, source, itemCount, fileExists, snapshotPath
 * The actual /api/health response contains: status, lastSync, sourcesRefreshed, failedSources
 * Those spec fields are NOT present in the current backend implementation.
 */
export async function getHealth(client: MantleYieldApiClient) {
  const data = await client.fetchHealth();
  return {
    status: "ok" as const,
    data,
    backendGaps: [
      {
        code: "missing_field" as const,
        message:
          "Backend /api/health does not return: syncedAt, nextRefresh, source, itemCount, fileExists, snapshotPath. " +
          "It returns: status (e.g. 'Healthy'), lastSync, sourcesRefreshed, failedSources.",
        endpoint: "/api/health",
      },
    ],
  };
}

