import type { MantleYieldApiClient } from "../client/apiClient.js";
import type { OpportunityQueryParams } from "../schemas/opportunity.js";

export async function listOpportunities(
  client: MantleYieldApiClient,
  params: OpportunityQueryParams,
) {
  const response = await client.fetchOpportunities(params);
  return {
    status: "ok" as const,
    data: response,
    backendGaps: [],
  };
}
