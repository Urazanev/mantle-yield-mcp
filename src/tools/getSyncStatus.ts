import type { MantleYieldApiClient } from "../client/apiClient.js";

export async function getSyncStatus(client: MantleYieldApiClient) {
  const syncStatus = await client.fetchSyncStatus();
  return {
    status: "ok" as const,
    data: syncStatus,
    backendGaps: [],
  };
}
