import type { MantleYieldApiClient } from "../client/apiClient.js";

export async function getDashboardSummary(client: MantleYieldApiClient) {
  const summary = await client.fetchSummary();
  return {
    status: "ok" as const,
    data: summary,
    backendGaps: [],
  };
}
