import type { MantleYieldApiClient } from "../client/apiClient.js";

/**
 * mantle_compare_opportunities — compare up to 3 opportunities
 * Fetches each opportunity individually via GET /api/opportunities/:id
 */
export async function compareOpportunities(client: MantleYieldApiClient, ids: string[]) {
  const opportunities = await Promise.all(ids.map((id) => client.fetchOpportunity(id)));

  const items = opportunities.map((opp) => ({
    id: opp.id,
    protocolName: opp.protocolName,
    strategyType: opp.strategyType,
    assetSymbol: opp.assetSymbol,
    apy: opp.apy,
    apyBase: opp.apyBase,
    apyReward: opp.apyReward,
    tvlUsd: opp.tvlUsd,
    exposureType: opp.exposureType,
    complexity: opp.complexity,
    lockupLabel: opp.lockupLabel,
    updatedAt: opp.updatedAt,
  }));

  return {
    status: "ok" as const,
    data: { items },
    backendGaps: [],
  };
}
