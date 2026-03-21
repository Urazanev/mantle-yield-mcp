import {
  type OpportunitiesResponse,
  type Opportunity,
  type OpportunityQueryParams,
  type SummaryData,
  parseOpportunitiesResponse,
  parseOpportunity,
  parseSummaryData,
} from "../schemas/opportunity.js";
import { type HealthData, parseHealthData } from "../schemas/health.js";
import { type ChartData, parseChartData } from "../schemas/chart.js";
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

  /** GET /api/health */
  async fetchHealth(): Promise<HealthData> {
    const payload = await this.requestJson("/api/health");
    return parseHealthData(payload);
  }

  /** GET /api/summary */
  async fetchSummary(): Promise<SummaryData> {
    const payload = await this.requestJson("/api/summary");
    return parseSummaryData(payload);
  }

  /** GET /api/opportunities */
  async fetchOpportunities(params: OpportunityQueryParams = {}): Promise<OpportunitiesResponse> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        query.set(key, String(value));
      }
    }
    const path = `/api/opportunities${query.size > 0 ? `?${query.toString()}` : ""}`;
    const payload = await this.requestJson(path);
    return parseOpportunitiesResponse(payload);
  }

  /** GET /api/opportunities/:id */
  async fetchOpportunity(id: string): Promise<Opportunity> {
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

  /** GET /api/opportunities/:id/chart */
  async fetchOpportunityChart(id: string): Promise<ChartData> {
    const path = `/api/opportunities/${encodeURIComponent(id)}/chart`;
    const payload = await this.requestJson(path);
    return parseChartData(payload);
  }

  /** POST /api/refresh */
  async refreshData(): Promise<{ message: string }> {
    const payload = await this.requestJson("/api/refresh", { method: "POST" });
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as Record<string, unknown>).message !== "string"
    ) {
      throw new InconsistentBackendContractError(
        'Expected /api/refresh to return {"message": string}',
        "/api/refresh",
      );
    }
    return { message: (payload as Record<string, unknown>).message as string };
  }

  private async requestJson(
    path: string,
    options: {
      classify404?: "missing_endpoint" | "details_endpoint";
      method?: "GET" | "POST";
    } = {},
  ): Promise<unknown> {
    const endpoint = `${this.env.apiBaseUrl}${path}`;
    const method = options.method ?? "GET";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.apiTimeoutMs);

    try {
      this.logger.debug(`Requesting ${method} ${endpoint}`);
      const response = await fetch(endpoint, {
        method,
        headers: this.buildHeaders(),
        signal: controller.signal,
      });

      const text = await response.text();

      if (response.status === 404) {
        if (options.classify404 === "details_endpoint") {
          const maybeJson = safeJsonParse(text);
          if (isNotFoundResponse(maybeJson)) {
            throw new ResourceNotFoundError(`Opportunity at ${path}`, "fetchOpportunity");
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
      "Content-Type": "application/json",
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
    typeof (value as Record<string, unknown>).error === "string"
  );
}
