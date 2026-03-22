import type { MantleYieldApiClient } from "../client/apiClient.js";

/**
 * mantle_get_health — GET /api/health
 */
export async function getHealth(client: MantleYieldApiClient) {
  const data = await client.fetchHealth();
  return {
    status: "ok" as const,
    data,
    backendGaps: [],
  };
}
