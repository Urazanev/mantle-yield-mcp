import { InvalidPayloadShapeError, MissingFieldError } from "../utils/errors.js";

/**
 * Actual /api/health response shape (as returned by the live backend).
 */
export interface HealthData {
  status: string;
  syncedAt: string | null;
  nextRefresh: string | null;
  source: string | null;
  itemCount: number | null;
  fileExists: boolean | null;
  snapshotPath: string | null;
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

  const syncedAt = value.syncedAt;
  const nextRefresh = value.nextRefresh;
  const source = value.source;
  const itemCount = value.itemCount;
  const fileExists = value.fileExists;
  const snapshotPath = value.snapshotPath;

  return {
    status,
    syncedAt: typeof syncedAt === "string" ? syncedAt : null,
    nextRefresh: typeof nextRefresh === "string" ? nextRefresh : null,
    source: typeof source === "string" ? source : null,
    itemCount: typeof itemCount === "number" ? itemCount : null,
    fileExists: typeof fileExists === "boolean" ? fileExists : null,
    snapshotPath: typeof snapshotPath === "string" ? snapshotPath : null,
  };
}
