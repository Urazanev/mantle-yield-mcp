import type { MantleYieldApiClient } from "../client/apiClient.js";

/**
 * mantle_refresh_data — POST /api/refresh
 */
export async function refreshData(client: MantleYieldApiClient) {
  const result = await client.refreshData();
  return {
    status: "ok" as const,
    data: result,
    backendGaps: [],
  };
}
