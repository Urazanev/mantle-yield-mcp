import { InvalidPayloadShapeError, MissingFieldError } from "../utils/errors.js";

/**
 * Actual /api/health response shape (as returned by the live backend).
 *
 * NOTE: The spec describes additional fields (syncedAt, nextRefresh, source,
 * itemCount, fileExists, snapshotPath) that are NOT present in the current
 * backend response. Those are tracked as backend gaps in the tool layer.
 */
export interface HealthData {
  status: string;
  lastSync: string | null;
  sourcesRefreshed: number;
  failedSources: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseHealthData(value: unknown): HealthData {
  if (!isRecord(value)) {
    throw new InvalidPayloadShapeError("Health payload must be an object", "HealthData");
  }

  const status = value.status;
  if (typeof status !== "string") {
    if (status === undefined) {
      throw new MissingFieldError("status", "HealthData");
    }
    throw new InvalidPayloadShapeError('Field "status" must be a string', "HealthData");
  }

  const lastSync = value.lastSync;
  if (lastSync !== null && lastSync !== undefined && typeof lastSync !== "string") {
    throw new InvalidPayloadShapeError('Field "lastSync" must be a string or null', "HealthData");
  }

  const sourcesRefreshed = value.sourcesRefreshed;
  if (typeof sourcesRefreshed !== "number") {
    if (sourcesRefreshed === undefined) {
      throw new MissingFieldError("sourcesRefreshed", "HealthData");
    }
    throw new InvalidPayloadShapeError('Field "sourcesRefreshed" must be a number', "HealthData");
  }

  const failedSources = value.failedSources;
  if (!Array.isArray(failedSources) || failedSources.some((item) => typeof item !== "string")) {
    throw new InvalidPayloadShapeError('Field "failedSources" must be an array of strings', "HealthData");
  }

  return {
    status,
    lastSync: typeof lastSync === "string" ? lastSync : null,
    sourcesRefreshed,
    failedSources,
  };
}

