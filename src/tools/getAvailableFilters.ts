import type { MantleYieldApiClient } from "../client/apiClient.js";
import { deriveAvailableFilters } from "../schemas/filters.js";
import { MissingEndpointError, toBackendGap } from "../utils/errors.js";

export async function getAvailableFilters(client: MantleYieldApiClient) {
  try {
    const filters = await client.fetchAvailableFilters();
    return {
      status: "ok" as const,
      data: filters,
      backendGaps: [],
    };
  } catch (error) {
    if (!(error instanceof MissingEndpointError)) {
      throw error;
    }

    const opportunities = await client.fetchOpportunities({ limit: 100, page: 1 });
    const filters = deriveAvailableFilters(opportunities.items);

    return {
      status: "partial" as const,
      data: filters,
      backendGaps: [toBackendGap(error)],
    };
  }
}
