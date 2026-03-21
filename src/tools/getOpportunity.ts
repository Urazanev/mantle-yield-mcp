import type { MantleYieldApiClient } from "../client/apiClient.js";
/**
 * mantle_get_opportunity — GET /api/opportunities/:id
 */
export async function getOpportunity(client: MantleYieldApiClient, id: string) {
  const data = await client.fetchOpportunity(id);
  return {
    status: "ok" as const,
    data,
    backendGaps: [],
  };
}
