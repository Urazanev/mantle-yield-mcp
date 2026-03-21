import type { Opportunity, OpportunityQueryParams } from "./opportunity.js";
import { InvalidPayloadShapeError } from "../utils/errors.js";

export interface AvailableFilters {
  assets: string[];
  strategies: string[];
  complexities: string[];
  lockupOptions: string[];
  exposures: string[];
  sortOptions: Array<OpportunityQueryParams["sort"]>;
}

export function deriveAvailableFilters(opportunities: Opportunity[]): AvailableFilters {
  const active = opportunities.filter((item) => item.isActive);

  return {
    assets: uniqueSorted(active.map((item) => item.assetSymbol)),
    strategies: uniqueSorted(active.map((item) => item.strategyType)),
    complexities: uniqueSorted(active.map((item) => item.complexity)),
    lockupOptions: ["none", "has"],
    exposures: uniqueSorted(active.map((item) => item.exposureType)),
    sortOptions: ["apy_desc", "apy_asc", "tvl_desc", "tvl_asc", "protocol_az"],
  };
}

export function parseAvailableFilters(value: unknown): AvailableFilters {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidPayloadShapeError("Available filters payload must be an object");
  }

  const record = value as Record<string, unknown>;

  return {
    assets: parseStringArray(record.assets, "assets"),
    strategies: parseStringArray(record.strategies, "strategies"),
    complexities: parseStringArray(record.complexities, "complexities"),
    lockupOptions: parseStringArray(record.lockupOptions, "lockupOptions"),
    exposures: parseStringArray(record.exposures, "exposures"),
    sortOptions: parseSortArray(record.sortOptions),
  };
}

function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new InvalidPayloadShapeError(`Field "${field}" must be an array of strings`);
  }
  return uniqueSorted(value);
}

function parseSortArray(value: unknown): Array<OpportunityQueryParams["sort"]> {
  if (!Array.isArray(value)) {
    throw new InvalidPayloadShapeError('Field "sortOptions" must be an array');
  }

  const allowed = new Set(["apy_desc", "apy_asc", "tvl_desc", "tvl_asc", "protocol_az"]);
  for (const item of value) {
    if (typeof item !== "string" || !allowed.has(item)) {
      throw new InvalidPayloadShapeError(`Invalid sort option "${String(item)}"`);
    }
  }

  return value as Array<OpportunityQueryParams["sort"]>;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
