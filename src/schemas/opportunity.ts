import { InvalidPayloadShapeError, MissingFieldError } from "../utils/errors.js";

export type OpportunityComplexity = "Low" | "Med" | "High";
export type BackendStatus = "Healthy" | "Partial" | "Delayed" | "Unknown";

export interface Opportunity {
  id: string;
  protocolSlug: string;
  protocolName: string;
  protocolUrl: string | null;
  source: string;
  chain: "Mantle";
  strategyType: string;
  category: string;
  assetSymbol: string;
  assetPairLabel: string | null;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  tvlUsd: number | null;
  exposureType: string;
  complexity: OpportunityComplexity;
  lockupLabel: string;
  updatedAt: string;
  sourcePoolId: string | null;
  isActive: boolean;
  underlyingTokens?: string[];
  rewardTokens?: string[];
  poolMeta?: string | null;
  notes?: string | null;
}

export interface SummaryData {
  opportunitiesTracked: number;
  protocols: number;
  assetsIndexed: number;
  lastSync: string | null;
  /** Raw status string from backend (e.g. "Healthy", "Partial", "Delayed", "Unknown") */
  status: string;
}

export interface OpportunitiesResponse {
  items: Opportunity[];
  total: number;
  page: number;
  limit: number;
  syncMeta: {
    lastSync: string | null;
    nextRefresh: string | null;
    sourcesRefreshed: number;
    failedSources: string[];
    status: BackendStatus;
  };
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

export interface DerivedProtocolEntry {
  slug: string;
  name: string;
  url: string | null;
  opportunityCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") {
    if (value === undefined) {
      throw new MissingFieldError(field, "Opportunity");
    }
    throw new InvalidPayloadShapeError(`Field "${field}" must be a string`);
  }
  return value;
}

function requireNullableString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    if (value === undefined) {
      throw new MissingFieldError(field, "Opportunity");
    }
    throw new InvalidPayloadShapeError(`Field "${field}" must be a string or null`);
  }
  return value;
}

function requireNullableNumber(record: Record<string, unknown>, field: string): number | null {
  const value = record[field];
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    if (value === undefined) {
      throw new MissingFieldError(field, "Opportunity");
    }
    throw new InvalidPayloadShapeError(`Field "${field}" must be a number or null`);
  }
  return value;
}

function requireBoolean(record: Record<string, unknown>, field: string): boolean {
  const value = record[field];
  if (typeof value !== "boolean") {
    if (value === undefined) {
      throw new MissingFieldError(field, "Opportunity");
    }
    throw new InvalidPayloadShapeError(`Field "${field}" must be a boolean`);
  }
  return value;
}

function optionalStringArray(record: Record<string, unknown>, field: string): string[] | undefined {
  const value = record[field];
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new InvalidPayloadShapeError(`Field "${field}" must be an array of strings`);
  }
  return value;
}

export function parseOpportunity(value: unknown): Opportunity {
  if (!isRecord(value)) {
    throw new InvalidPayloadShapeError("Opportunity item must be an object");
  }

  const chain = requireString(value, "chain");
  if (chain !== "Mantle") {
    throw new InvalidPayloadShapeError(`Field "chain" must equal "Mantle", got "${chain}"`);
  }

  const complexityRaw = requireString(value, "complexity");
  if (!["Low", "Med", "High"].includes(complexityRaw)) {
    throw new InvalidPayloadShapeError(`Unexpected complexity value "${complexityRaw}"`);
  }
  const complexity = complexityRaw as OpportunityComplexity;

  return {
    id: requireString(value, "id"),
    protocolSlug: requireString(value, "protocolSlug"),
    protocolName: requireString(value, "protocolName"),
    protocolUrl: requireNullableString(value, "protocolUrl"),
    source: requireString(value, "source"),
    chain: "Mantle",
    strategyType: requireString(value, "strategyType"),
    category: requireString(value, "category"),
    assetSymbol: requireString(value, "assetSymbol"),
    assetPairLabel: requireNullableString(value, "assetPairLabel"),
    apy: requireNullableNumber(value, "apy"),
    apyBase: requireNullableNumber(value, "apyBase"),
    apyReward: requireNullableNumber(value, "apyReward"),
    tvlUsd: requireNullableNumber(value, "tvlUsd"),
    exposureType: requireString(value, "exposureType"),
    complexity,
    lockupLabel: requireString(value, "lockupLabel"),
    updatedAt: requireString(value, "updatedAt"),
    sourcePoolId: requireNullableString(value, "sourcePoolId"),
    isActive: requireBoolean(value, "isActive"),
    underlyingTokens: optionalStringArray(value, "underlyingTokens"),
    rewardTokens: optionalStringArray(value, "rewardTokens"),
    poolMeta: value.poolMeta === undefined ? undefined : requireNullableString(value, "poolMeta"),
    notes: value.notes === undefined ? undefined : requireNullableString(value, "notes"),
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

  return {
    opportunitiesTracked: requireNumber(value, "opportunitiesTracked", "Summary"),
    protocols: requireNumber(value, "protocols", "Summary"),
    assetsIndexed: requireNumber(value, "assetsIndexed", "Summary"),
    lastSync: requireNullableStringFrom(value, "lastSync", "Summary"),
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

  return {
    items: value.items.map((item) => parseOpportunity(item)),
    total: requireNumber(value, "total", "OpportunitiesResponse"),
    page: requireNumber(value, "page", "OpportunitiesResponse"),
    limit: requireNumber(value, "limit", "OpportunitiesResponse"),
    syncMeta: parseSyncMeta(value.syncMeta),
  };
}

function parseSyncMeta(value: unknown): OpportunitiesResponse["syncMeta"] {
  if (!isRecord(value)) {
    throw new MissingFieldError("syncMeta", "OpportunitiesResponse");
  }

  const statusRaw = value.status;
  if (typeof statusRaw !== "string" || !["Healthy", "Partial", "Delayed", "Unknown"].includes(statusRaw)) {
    throw new InvalidPayloadShapeError("syncMeta.status is invalid");
  }
  const status = statusRaw as BackendStatus;

  if (!Array.isArray(value.failedSources) || value.failedSources.some((item) => typeof item !== "string")) {
    throw new InvalidPayloadShapeError('Field "failedSources" must be an array of strings');
  }

  return {
    lastSync: requireNullableStringFrom(value, "lastSync", "SyncMeta"),
    nextRefresh: requireNullableStringFrom(value, "nextRefresh", "SyncMeta"),
    sourcesRefreshed: requireNumber(value, "sourcesRefreshed", "SyncMeta"),
    failedSources: value.failedSources,
    status,
  };
}

function requireNumber(record: Record<string, unknown>, field: string, context: string): number {
  const value = record[field];
  if (typeof value !== "number" || Number.isNaN(value)) {
    if (value === undefined) {
      throw new MissingFieldError(field, context);
    }
    throw new InvalidPayloadShapeError(`Field "${field}" in ${context} must be a number`);
  }
  return value;
}

function requireNullableStringFrom(record: Record<string, unknown>, field: string, context: string): string | null {
  const value = record[field];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    if (value === undefined) {
      throw new MissingFieldError(field, context);
    }
    throw new InvalidPayloadShapeError(`Field "${field}" in ${context} must be a string or null`);
  }
  return value;
}
