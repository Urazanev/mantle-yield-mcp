import { MantleYieldApiClient } from "./client/apiClient.js";
import type { OpportunityQueryParams } from "./schemas/opportunity.js";
import { compareOpportunities } from "./tools/compareOpportunities.js";
import { getHealth } from "./tools/getHealth.js";
import { getOpportunity } from "./tools/getOpportunity.js";
import { getOpportunityChart } from "./tools/getOpportunityChart.js";
import { getSummary } from "./tools/getSummary.js";
import { listOpportunities } from "./tools/listOpportunities.js";
import { refreshData } from "./tools/refreshData.js";
import { loadEnv } from "./utils/env.js";
import { InvalidPayloadShapeError, toBackendGap } from "./utils/errors.js";
import { Logger } from "./utils/logger.js";

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

const env = loadEnv();
const logger = new Logger(env.logLevel);
const client = new MantleYieldApiClient(env, logger);

const tools: ToolDefinition[] = [
  // ── TOOL 1 ─────────────────────────────────────────────────────────────────
  {
    name: "mantle_get_health",
    description:
      "Get the technical health status of the Mantle Yield backend service. " +
      "Calls GET /api/health. Returns status, lastSync, sourcesRefreshed, failedSources. " +
      "Note: some fields described in the spec (syncedAt, nextRefresh, source, itemCount, " +
      "fileExists, snapshotPath) are not yet present in the backend response.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => getHealth(client),
  },

  // ── TOOL 2 ─────────────────────────────────────────────────────────────────
  {
    name: "mantle_get_summary",
    description:
      "Get the Mantle Yield dashboard summary. " +
      "Calls GET /api/summary. Returns opportunitiesTracked, protocols, assetsIndexed, lastSync, status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => getSummary(client),
  },

  // ── TOOL 3 ─────────────────────────────────────────────────────────────────
  {
    name: "mantle_list_opportunities",
    description:
      "List yield opportunities from the Mantle Yield backend. " +
      "Calls GET /api/opportunities. Supports filtering, sorting and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        asset: { type: "string", description: "Filter by asset symbol, e.g. 'USDT'" },
        strategy: { type: "string", description: "Filter by strategy type, e.g. 'Lending'" },
        complexity: { type: "string", description: "Filter by complexity: 'Low', 'Med', or 'High'" },
        lockup: { type: "string", description: "Filter by lockup: 'none' or 'has'" },
        exposure: { type: "string", description: "Filter by exposure type, e.g. 'Lending'" },
        sort: {
          type: "string",
          enum: ["apy_desc", "apy_asc", "tvl_desc", "tvl_asc", "protocol_az"],
          description: "Sort order",
        },
        page: { type: "number", minimum: 1, description: "Page number (1-based)" },
        limit: { type: "number", minimum: 1, maximum: 200, description: "Items per page" },
      },
      additionalProperties: false,
    },
    handler: async (args) => listOpportunities(client, validateOpportunityParams(args)),
  },

  // ── TOOL 4 ─────────────────────────────────────────────────────────────────
  {
    name: "mantle_get_opportunity",
    description:
      "Get full details for a single yield opportunity by its ID. " +
      "Calls GET /api/opportunities/:id.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Opportunity ID (UUID)" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (args) => getOpportunity(client, requireString(args, "id")),
  },

  // ── TOOL 5 ─────────────────────────────────────────────────────────────────
  {
    name: "mantle_get_opportunity_chart",
    description:
      "Get historical chart data (APY / TVL over time) for a yield opportunity. " +
      "Calls GET /api/opportunities/:id/chart. " +
      "NOTE: This backend endpoint is not yet implemented and will return a backend_gap status.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Opportunity ID (UUID)" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (args) => getOpportunityChart(client, requireString(args, "id")),
  },

  // ── TOOL 6 ─────────────────────────────────────────────────────────────────
  {
    name: "mantle_compare_opportunities",
    description:
      "Compare 2 or 3 yield opportunities side by side. " +
      "Fetches each opportunity via GET /api/opportunities/:id and returns a unified comparison structure.",
    inputSchema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 3,
          description: "Array of 2 or 3 opportunity IDs to compare",
        },
      },
      required: ["ids"],
      additionalProperties: false,
    },
    handler: async (args) => compareOpportunities(client, requireStringArray(args, "ids", 2, 3)),
  },

  // ── TOOL 7 ─────────────────────────────────────────────────────────────────
  {
    name: "mantle_refresh_data",
    description:
      "Trigger a manual data refresh on the backend. " +
      "Calls POST /api/refresh. " +
      "NOTE: This backend endpoint is not yet implemented and will return a backend_gap status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => refreshData(client),
  },
];

const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

// ── MCP stdio transport ──────────────────────────────────────────────────────

let buffer = "";
let expectedContentLength: number | null = null;

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  while (true) {
    if (expectedContentLength === null) {
      const crlfIdx = buffer.indexOf("\r\n\r\n");
      const lfIdx = buffer.indexOf("\n\n");

      let sepIdx = -1;
      let sepLen = 0;

      if (crlfIdx !== -1 && (lfIdx === -1 || crlfIdx < lfIdx)) {
        sepIdx = crlfIdx;
        sepLen = 4;
      } else if (lfIdx !== -1) {
        sepIdx = lfIdx;
        sepLen = 2;
      }

      if (sepIdx === -1) return;

      const headerBlock = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + sepLen);
      const match = headerBlock.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        logger.error("Missing Content-Length header");
        continue;
      }
      expectedContentLength = Number.parseInt(match[1], 10);
    }

    if (buffer.length < expectedContentLength) return;

    const rawMessage = buffer.slice(0, expectedContentLength);
    buffer = buffer.slice(expectedContentLength);
    expectedContentLength = null;

    void handleMessage(rawMessage);
  }
});

process.stdin.on("end", () => {
  logger.info("STDIN closed, shutting down");
  process.exit(0);
});

async function handleMessage(rawMessage: string): Promise<void> {
  let request: JsonRpcRequest;
  try {
    request = JSON.parse(rawMessage) as JsonRpcRequest;
  } catch (error) {
    sendError(null, -32700, `Parse error: ${(error as Error).message}`);
    return;
  }

  if (request.jsonrpc !== "2.0" || typeof request.method !== "string") {
    sendError(request.id ?? null, -32600, "Invalid Request");
    return;
  }

  try {
    switch (request.method) {
      case "initialize":
        sendResult(request.id ?? null, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "mantle-yield-mcp", version: "0.1.0" },
        });
        return;
      case "notifications/initialized":
        return;
      case "ping":
        sendResult(request.id ?? null, {});
        return;
      case "tools/list":
        sendResult(request.id ?? null, {
          tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
        });
        return;
      case "tools/call":
        await handleToolCall(request);
        return;
      default:
        sendError(request.id ?? null, -32601, `Method not found: ${request.method}`);
    }
  } catch (error) {
    logger.error("Unhandled request failure", { error: toBackendGap(error) });
    sendError(request.id ?? null, -32603, (error as Error).message);
  }
}

async function handleToolCall(request: JsonRpcRequest): Promise<void> {
  const params = request.params ?? {};
  const toolName = requireString(params, "name");
  const tool = toolsByName.get(toolName);

  if (!tool) {
    sendError(request.id ?? null, -32601, `Unknown tool: ${toolName}`);
    return;
  }

  const args = isRecord(params.arguments) ? params.arguments : {};

  try {
    const result = await tool.handler(args);
    sendResult(request.id ?? null, {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
      isError: false,
    });
  } catch (error) {
    const gap = toBackendGap(error);
    logger.error(`Tool "${toolName}" failed`, { gap });
    sendResult(request.id ?? null, {
      content: [
        {
          type: "text",
          text: JSON.stringify({ status: "error", backendGaps: [gap] }, null, 2),
        },
      ],
      structuredContent: { status: "error", backendGaps: [gap] },
      isError: true,
    });
  }
}

function sendResult(id: JsonRpcId, result: unknown): void {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function sendError(id: JsonRpcId, code: number, message: string): void {
  writeMessage({ jsonrpc: "2.0", id, error: { code, message } });
}

function writeMessage(payload: unknown): void {
  const body = JSON.stringify(payload);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

// ── Validation helpers ───────────────────────────────────────────────────────

function requireString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new InvalidPayloadShapeError(`Field "${field}" must be a string`, "mcp_input");
  }
  return value;
}

function requireStringArray(
  record: Record<string, unknown>,
  field: string,
  minItems: number,
  maxItems: number,
): string[] {
  const value = record[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new InvalidPayloadShapeError(`Field "${field}" must be an array of strings`, "mcp_input");
  }
  if (value.length < minItems || value.length > maxItems) {
    throw new InvalidPayloadShapeError(
      `Field "${field}" must contain between ${minItems} and ${maxItems} items`,
      "mcp_input",
    );
  }
  return value as string[];
}

function validateOpportunityParams(args: Record<string, unknown>): OpportunityQueryParams {
  const params: OpportunityQueryParams = {};
  const stringFields = ["asset", "strategy", "complexity", "lockup", "exposure", "sort"] as const;

  for (const field of stringFields) {
    const value = args[field];
    if (value !== undefined) {
      if (typeof value !== "string") {
        throw new InvalidPayloadShapeError(`Field "${field}" must be a string`, "mcp_input");
      }
      params[field] = value as never;
    }
  }

  for (const field of ["page", "limit"] as const) {
    const value = args[field];
    if (value !== undefined) {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
        throw new InvalidPayloadShapeError(`Field "${field}" must be a positive integer`, "mcp_input");
      }
      params[field] = value;
    }
  }

  return params;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ── Start ────────────────────────────────────────────────────────────────────

logger.info("Mantle Yield MCP server started", {
  apiBaseUrl: env.apiBaseUrl,
  tools: tools.map((t) => t.name),
});
