import type { MantleYieldApiClient } from "../client/apiClient.js";

export async function compareOpportunities(client: MantleYieldApiClient, ids: string[]) {
  const items = await Promise.all(ids.map((id) => client.fetchOpportunityDetails(id)));

  return {
    status: "ok" as const,
    data: {
      items,
      comparedFields: [
        "protocolName",
        "assetSymbol",
        "strategyType",
        "apy",
        "apyBase",
        "apyReward",
        "tvlUsd",
        "exposureType",
        "complexity",
        "lockupLabel",
        "updatedAt",
      ],
      source: "/api/opportunities/:id",
    },
    backendGaps: [],
  };
}
