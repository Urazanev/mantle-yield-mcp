import { InvalidPayloadShapeError, MissingFieldError } from "../utils/errors.js";

export interface Opportunity {
  id: string;
  poolId: string | null;
  protocolName: string;
  protocolUrl: string | null;
  strategy: string;
  asset: string;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  tvlUsd: number | null;
  exposure: string;
  complexity: string;
  lockup: string;
  updated: string | null;
  updatedAt: string;
  iconType: string | null;
  chain: string;
  underlyingTokens?: string[];
  rewardTokens?: string[];
  poolMeta?: string | null;
  isActive: boolean;
}

export interface SummaryData {
  opportunitiesTracked: number;
  protocols: number;
  assetsIndexed: number;
  lastSync: string | null;
  status: string;
}

export interface OpportunitiesResponse {
  items: Opportunity[];
  total: number;
  page: number;
  limit: number;
  syncedAt: string | null;
  status: string;
}

export interface OpportunityQueryParams {
  asset?: string;
  strategy?: string;
  complexity?: string;
  lockup?: string;
  exposure?: string;
  sort?: "apy_desc" | "apy_asc" | "tvl_desc" | "tvl_asc" | "protocol_az";
  page?: number;
  limit?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, field: string, context = "Opportunity"): string {
  const value = record[field];
  if (typeof value !== "string") {
    if (value === undefined) throw new MissingFieldError(field, context);
    throw new InvalidPayloadShapeError(`Field "${field}" must be a string`);
  }
  return value;
}

function requireNullableString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new InvalidPayloadShapeError(`Field "${field}" must be a string or null`);
  }
  return value;
}

function requireNullableNumber(record: Record<string, unknown>, field: string): number | null {
  const value = record[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new InvalidPayloadShapeError(`Field "${field}" must be a number or null`);
  }
  return value;
}

function requireBoolean(record: Record<string, unknown>, field: string): boolean {
  const value = record[field];
  if (typeof value !== "boolean") {
    if (value === undefined) throw new MissingFieldError(field, "Opportunity");
    throw new InvalidPayloadShapeError(`Field "${field}" must be a boolean`);
  }
  return value;
}

function optionalStringArray(record: Record<string, unknown>, field: string): string[] | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new InvalidPayloadShapeError(`Field "${field}" must be an array of strings`);
  }
  return value;
}

function requireNumber(record: Record<string, unknown>, field: string, context: string): number {
  const value = record[field];
  if (typeof value !== "number" || Number.isNaN(value)) {
    if (value === undefined) throw new MissingFieldError(field, context);
    throw new InvalidPayloadShapeError(`Field "${field}" in ${context} must be a number`);
  }
  return value;
}

export function parseOpportunity(value: unknown): Opportunity {
  if (!isRecord(value)) {
    throw new InvalidPayloadShapeError("Opportunity item must be an object");
  }

  return {
    id: requireString(value, "id"),
    poolId: requireNullableString(value, "poolId"),
    protocolName: requireString(value, "protocolName"),
    protocolUrl: requireNullableString(value, "protocolUrl"),
    strategy: requireString(value, "strategy"),
    asset: requireString(value, "asset"),
    apy: requireNullableNumber(value, "apy"),
    apyBase: requireNullableNumber(value, "apyBase"),
    apyReward: requireNullableNumber(value, "apyReward"),
    tvlUsd: requireNullableNumber(value, "tvlUsd"),
    exposure: requireString(value, "exposure"),
    complexity: requireString(value, "complexity"),
    lockup: requireString(value, "lockup"),
    updated: requireNullableString(value, "updated"),
    updatedAt: requireString(value, "updatedAt"),
    iconType: requireNullableString(value, "iconType"),
    chain: requireString(value, "chain"),
    underlyingTokens: optionalStringArray(value, "underlyingTokens"),
    rewardTokens: optionalStringArray(value, "rewardTokens"),
    poolMeta: value.poolMeta === undefined ? undefined : requireNullableString(value, "poolMeta"),
    isActive: requireBoolean(value, "isActive"),
  };
}

export function parseSummaryData(value: unknown): SummaryData {
  if (!isRecord(value)) {
    throw new InvalidPayloadShapeError("Summary payload must be an object");
  }

  const statusRaw = value.status;
  if (typeof statusRaw !== "string") {
    throw new InvalidPayloadShapeError("Summary status is invalid or missing");
  }

  const lastSync = value.lastSync;

  return {
    opportunitiesTracked: requireNumber(value, "opportunitiesTracked", "Summary"),
    protocols: requireNumber(value, "protocols", "Summary"),
    assetsIndexed: requireNumber(value, "assetsIndexed", "Summary"),
    lastSync: typeof lastSync === "string" ? lastSync : null,
    status: statusRaw,
  };
}

export function parseOpportunitiesResponse(value: unknown): OpportunitiesResponse {
  if (!isRecord(value)) {
    throw new InvalidPayloadShapeError("Opportunities response must be an object");
  }

  if (!Array.isArray(value.items)) {
    throw new InvalidPayloadShapeError('Field "items" must be an array');
  }

  const syncedAt = value.syncedAt;
  const statusRaw = value.status;

  return {
    items: value.items.map((item) => parseOpportunity(item)),
    total: requireNumber(value, "total", "OpportunitiesResponse"),
    page: requireNumber(value, "page", "OpportunitiesResponse"),
    limit: requireNumber(value, "limit", "OpportunitiesResponse"),
    syncedAt: typeof syncedAt === "string" ? syncedAt : null,
    status: typeof statusRaw === "string" ? statusRaw : "unknown",
  };
}
