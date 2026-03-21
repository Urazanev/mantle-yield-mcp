import {
  type DerivedProtocolEntry,
  type OpportunitiesResponse,
  type Opportunity,
  type OpportunityQueryParams,
  type SummaryData,
  parseOpportunitiesResponse,
  parseOpportunity,
  parseSummaryData,
} from "../schemas/opportunity.js";
import { type AvailableFilters, parseAvailableFilters } from "../schemas/filters.js";
import { type SyncStatus, parseSyncStatus } from "../schemas/sync.js";
import {
  HttpRequestError,
  InconsistentBackendContractError,
  MissingEndpointError,
  ResourceNotFoundError,
  TimeoutError,
} from "../utils/errors.js";
import type { AppEnv } from "../utils/env.js";
import type { Logger } from "../utils/logger.js";

export class MantleYieldApiClient {
  constructor(
    private readonly env: AppEnv,
    private readonly logger: Logger,
  ) {}

  async fetchSummary(): Promise<SummaryData> {
    const payload = await this.requestJson("/api/summary");
    return parseSummaryData(payload);
  }

  async fetchOpportunities(params: OpportunityQueryParams = {}): Promise<OpportunitiesResponse> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        query.set(key, String(value));
      }
    }
    const payload = await this.requestJson(`/api/opportunities${query.size > 0 ? `?${query.toString()}` : ""}`);
    return parseOpportunitiesResponse(payload);
  }

  async fetchOpportunityDetails(id: string): Promise<Opportunity> {
    try {
      const payload = await this.requestJson(`/api/opportunities/${encodeURIComponent(id)}`, {
        classify404: "details_endpoint",
      });
      return parseOpportunity(payload);
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      if (error instanceof MissingEndpointError) {
        throw new InconsistentBackendContractError(
          "Expected backend endpoint /api/opportunities/:id is missing",
          "/api/opportunities/:id",
        );
      }
      throw error;
    }
  }

  async fetchSyncStatus(): Promise<SyncStatus> {
    const healthPayload = await this.requestJson("/api/health");
    const health = parseSyncStatus(healthPayload);

    try {
      const opportunities = await this.fetchOpportunities({ page: 1, limit: 1 });
      return {
        ...health,
        nextRefresh: opportunities.syncMeta.nextRefresh,
        lastFullSync: opportunities.syncMeta.lastSync ?? health.lastSync,
      };
    } catch {
      return health;
    }
  }

  async fetchAvailableFilters(): Promise<AvailableFilters> {
    const payload = await this.requestJson("/api/filters");
    return parseAvailableFilters(payload);
  }

  async fetchProtocols(): Promise<DerivedProtocolEntry[]> {
    const payload = await this.requestJson("/api/protocols");
    if (!Array.isArray(payload)) {
      throw new InconsistentBackendContractError("Expected /api/protocols to return an array", "/api/protocols");
    }

    return payload.map((item) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        throw new InconsistentBackendContractError("Protocol entry must be an object", "/api/protocols");
      }

      const record = item as Record<string, unknown>;
      if (typeof record.slug !== "string" || typeof record.name !== "string") {
        throw new InconsistentBackendContractError(
          'Protocol entry must include string fields "slug" and "name"',
          "/api/protocols",
        );
      }

      return {
        slug: record.slug,
        name: record.name,
        url: typeof record.url === "string" ? record.url : null,
        opportunityCount: typeof record.opportunityCount === "number" ? record.opportunityCount : 0,
      };
    });
  }

  private async requestJson(
    path: string,
    options: { classify404?: "missing_endpoint" | "details_endpoint" } = {},
  ): Promise<unknown> {
    const endpoint = `${this.env.apiBaseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.apiTimeoutMs);

    try {
      this.logger.debug("Requesting backend endpoint", { endpoint });
      const response = await fetch(endpoint, {
        method: "GET",
        headers: this.buildHeaders(),
        signal: controller.signal,
      });

      const text = await response.text();
      if (response.status === 404) {
        if (options.classify404 === "details_endpoint") {
          const maybeJson = safeJsonParse(text);
          if (isNotFoundResponse(maybeJson)) {
            throw new ResourceNotFoundError(`Opportunity at ${path}`, "fetchOpportunityDetails");
          }
        }
        throw new MissingEndpointError(path, response.status);
      }

      if (!response.ok) {
        throw new HttpRequestError(path, response.status, text.slice(0, 500));
      }

      try {
        return text ? JSON.parse(text) : null;
      } catch (error) {
        throw new InconsistentBackendContractError(
          `Endpoint ${path} returned invalid JSON: ${(error as Error).message}`,
          path,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(path, this.env.apiTimeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      Accept: "application/json",
    };

    if (this.env.apiToken) {
      headers.Authorization = `Bearer ${this.env.apiToken}`;
    }

    return headers;
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function isNotFoundResponse(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).error === "Not found"
  );
}
