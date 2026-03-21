import { InvalidPayloadShapeError, MissingFieldError } from "../utils/errors.js";

export interface ChartPoint {
  timestamp: string;
  apy: number | null;
  tvlUsd: number | null;
}

export interface ChartData {
  chart: ChartPoint[];
  tvlUsd: number | null;
  apy: number | null;
  updated: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseChartData(value: unknown): ChartData {
  if (!isRecord(value)) {
    throw new InvalidPayloadShapeError("Chart payload must be an object", "ChartData");
  }

  if (!Array.isArray(value.chart)) {
    throw new MissingFieldError("chart", "ChartData");
  }

  const chart: ChartPoint[] = value.chart.map((item: unknown, index: number) => {
    if (!isRecord(item)) {
      throw new InvalidPayloadShapeError(`chart[${index}] must be an object`, "ChartData");
    }
    const timestamp = item.timestamp;
    if (typeof timestamp !== "string") {
      throw new InvalidPayloadShapeError(`chart[${index}].timestamp must be a string`, "ChartData");
    }
    const apy = item.apy;
    const tvlUsd = item.tvlUsd;
    return {
      timestamp,
      apy: typeof apy === "number" ? apy : null,
      tvlUsd: typeof tvlUsd === "number" ? tvlUsd : null,
    };
  });

  const tvlUsd = value.tvlUsd;
  const apy = value.apy;
  const updated = value.updated;

  return {
    chart,
    tvlUsd: typeof tvlUsd === "number" ? tvlUsd : null,
    apy: typeof apy === "number" ? apy : null,
    updated: typeof updated === "string" ? updated : null,
  };
}

