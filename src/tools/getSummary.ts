import type { MantleYieldApiClient } from "../client/apiClient.js";
/**
 * mantle_get_summary — GET /api/summary
 */
export async function getSummary(client: MantleYieldApiClient) {
  const data = await client.fetchSummary();
  return {
    status: "ok" as const,
    data,
    backendGaps: [],
  };
}
