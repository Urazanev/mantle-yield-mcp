import type { MantleYieldApiClient } from "../client/apiClient.js";
import { MissingEndpointError, toBackendGap } from "../utils/errors.js";

export async function getProtocols(client: MantleYieldApiClient) {
  try {
    const protocols = await client.fetchProtocols();
    return {
      status: "ok" as const,
      data: protocols,
      backendGaps: [],
    };
  } catch (error) {
    if (!(error instanceof MissingEndpointError)) {
      throw error;
    }

    const opportunities = await client.fetchOpportunities({ limit: 100, page: 1 });
    const counts = new Map<string, { slug: string; name: string; url: string | null; opportunityCount: number }>();
    for (const item of opportunities.items) {
      const current = counts.get(item.protocolSlug);
      if (current) {
        current.opportunityCount += 1;
        continue;
      }

      counts.set(item.protocolSlug, {
        slug: item.protocolSlug,
        name: item.protocolName,
        url: item.protocolUrl,
        opportunityCount: 1,
      });
    }

    return {
      status: "partial" as const,
      data: [...counts.values()].sort((a, b) => a.name.localeCompare(b.name)),
      backendGaps: [toBackendGap(error)],
    };
  }
}
