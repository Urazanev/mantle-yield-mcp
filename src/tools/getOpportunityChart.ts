import type { MantleYieldApiClient } from "../client/apiClient.js";
import { MissingEndpointError } from "../utils/errors.js";
/**
 * mantle_get_opportunity_chart — GET /api/opportunities/:id/chart
 *
 * Backend gap: This endpoint is not yet implemented (returns 404).
 * When it becomes available, this tool will pass through the chart data.
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
    if (error instanceof MissingEndpointError) {
      return {
        status: "backend_gap" as const,
        data: null,
        backendGaps: [
          {
            code: "missing_endpoint" as const,
            message:
              "Backend endpoint GET /api/opportunities/:id/chart is not yet implemented (HTTP 404). " +
              "Chart history data is unavailable until this endpoint is added to the backend.",
            endpoint: `/api/opportunities/${id}/chart`,
          },
        ],
      };
    }
    throw error;
  }
}
