import type { MantleYieldApiClient } from "../client/apiClient.js";

export async function getOpportunityDetails(client: MantleYieldApiClient, id: string) {
  const opportunity = await client.fetchOpportunityDetails(id);
  return {
    status: "ok" as const,
    data: opportunity,
    backendGaps: [],
  };
}
