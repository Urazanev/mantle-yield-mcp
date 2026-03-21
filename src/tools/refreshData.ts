import type { MantleYieldApiClient } from "../client/apiClient.js";
import { MissingEndpointError } from "../utils/errors.js";
/**
 * mantle_refresh_data — POST /api/refresh
 *
 * Backend gap: This endpoint is not yet implemented (returns 404).
 * When it becomes available, this tool will trigger a backend data refresh.
 */
export async function refreshData(client: MantleYieldApiClient) {
  try {
    const result = await client.refreshData();
    return {
      status: "ok" as const,
      data: result,
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
              "Backend endpoint POST /api/refresh is not yet implemented (HTTP 404). " +
              "Manual data refresh is unavailable until this endpoint is added to the backend.",
            endpoint: "/api/refresh",
          },
        ],
      };
    }
    throw error;
  }
}
