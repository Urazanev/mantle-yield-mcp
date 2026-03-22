import type { MantleYieldApiClient } from "../client/apiClient.js";
import { ResourceNotFoundError } from "../utils/errors.js";

/**
 * mantle_get_opportunity_chart — GET /api/opportunities/:id/chart
 */
export async function getOpportunityChart(client: MantleYieldApiClient, id: string) {
  try {
    const data = await client.fetchOpportunityChart(id);
    return {
      status: "ok" as const,
      data,
      backendGaps: [],
    };
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return {
        status: "error" as const,
        data: null,
        backendGaps: [
          {
            code: "not_found" as const,
            message: `No chart data found for opportunity "${id}".`,
            endpoint: `/api/opportunities/${id}/chart`,
          },
        ],
      };
    }
    throw error;
  }
}
