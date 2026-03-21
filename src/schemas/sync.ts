import type { BackendStatus } from "./opportunity.js";
import { InvalidPayloadShapeError, MissingFieldError } from "../utils/errors.js";

export interface SyncStatus {
  status: BackendStatus;
  lastSync: string | null;
  lastFullSync: string | null;
  nextRefresh: string | null;
  sourcesRefreshed: number;
  failedSources: string[];
}

export function parseSyncStatus(value: unknown): SyncStatus {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidPayloadShapeError("Sync payload must be an object");
  }

  const record = value as Record<string, unknown>;
  const statusRaw = record.status;
  if (typeof statusRaw !== "string" || !["Healthy", "Partial", "Delayed", "Unknown"].includes(statusRaw)) {
    throw new InvalidPayloadShapeError('Field "status" has invalid value');
  }
  const status = statusRaw as BackendStatus;

  const failedSources = record.failedSources;
  if (!Array.isArray(failedSources) || failedSources.some((item) => typeof item !== "string")) {
    throw new InvalidPayloadShapeError('Field "failedSources" must be an array of strings');
  }

  const lastSync = parseNullableString(record, "lastSync", "SyncStatus");
  const nextRefresh = record.nextRefresh === undefined ? null : parseNullableString(record, "nextRefresh", "SyncStatus");

  return {
    status,
    lastSync,
    lastFullSync: lastSync,
    nextRefresh,
    sourcesRefreshed: parseNumber(record, "sourcesRefreshed", "SyncStatus"),
    failedSources,
  };
}

function parseNumber(record: Record<string, unknown>, field: string, context: string): number {
  const value = record[field];
  if (typeof value !== "number" || Number.isNaN(value)) {
    if (value === undefined) {
      throw new MissingFieldError(field, context);
    }
    throw new InvalidPayloadShapeError(`Field "${field}" in ${context} must be a number`);
  }
  return value;
}

function parseNullableString(record: Record<string, unknown>, field: string, context: string): string | null {
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
