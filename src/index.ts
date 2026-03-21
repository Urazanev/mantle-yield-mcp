import { MantleYieldApiClient } from "./client/apiClient.js";
import type { OpportunityQueryParams } from "./schemas/opportunity.js";
import { compareOpportunities } from "./tools/compareOpportunities.js";
import { getAvailableFilters } from "./tools/getAvailableFilters.js";
import { getDashboardSummary } from "./tools/getDashboardSummary.js";
import { getOpportunityDetails } from "./tools/getOpportunityDetails.js";
import { getProtocols } from "./tools/getProtocols.js";
import { getSyncStatus } from "./tools/getSyncStatus.js";
import { listOpportunities } from "./tools/listOpportunities.js";
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
  {
    name: "mantle_get_dashboard_summary",
    description: "Get Mantle Yield dashboard summary from backend /api/summary.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => getDashboardSummary(client),
  },
  {
    name: "mantle_list_opportunities",
    description: "List opportunities from backend /api/opportunities with filter and pagination support.",
    inputSchema: {
      type: "object",
      properties: {
        asset: { type: "string" },
        strategy: { type: "string" },
        complexity: { type: "string" },
        lockup: { type: "string", enum: ["none", "has"] },
        exposure: { type: "string" },
        sort: { type: "string", enum: ["apy_desc", "apy_asc", "tvl_desc", "tvl_asc", "protocol_az"] },
        page: { type: "number", minimum: 1 },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    handler: async (args) => listOpportunities(client, validateOpportunityParams(args)),
  },
  {
    name: "mantle_get_opportunity_details",
    description: "Get a single opportunity by id from backend /api/opportunities/:id.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (args) => getOpportunityDetails(client, requireString(args, "id")),
  },
  {
    name: "mantle_compare_opportunities",
    description: "Compare 2-3 opportunities by id using backend /api/opportunities/:id.",
    inputSchema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 3,
        },
      },
      required: ["ids"],
      additionalProperties: false,
    },
    handler: async (args) => compareOpportunities(client, requireStringArray(args, "ids", 2, 3)),
  },
  {
    name: "mantle_get_sync_status",
    description: "Get backend sync status from /api/health.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => getSyncStatus(client),
  },
  {
    name: "mantle_get_available_filters",
    description: "Get available filters. Uses /api/filters if present; otherwise derives from /api/opportunities and marks the backend gap.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => getAvailableFilters(client),
  },
  {
    name: "mantle_get_protocols",
    description: "Get protocols. Uses /api/protocols if present; otherwise derives from /api/opportunities and marks the backend gap.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => getProtocols(client),
  },
];

const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

let buffer = "";
let expectedContentLength: number | null = null;

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  while (true) {
    if (expectedContentLength === null) {
      const crlfSeparatorIndex = buffer.indexOf("\r\n\r\n");
      const lfSeparatorIndex = buffer.indexOf("\n\n");

      let separatorIndex = -1;
      let separatorLength = 0;

      if (crlfSeparatorIndex !== -1 && (lfSeparatorIndex === -1 || crlfSeparatorIndex < lfSeparatorIndex)) {
        separatorIndex = crlfSeparatorIndex;
        separatorLength = 4;
      } else if (lfSeparatorIndex !== -1) {
        separatorIndex = lfSeparatorIndex;
        separatorLength = 2;
      }

      if (separatorIndex === -1) {
        return;
      }

      const headerBlock = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + separatorLength);
      const match = headerBlock.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        logger.error("Missing Content-Length header");
        continue;
      }
      expectedContentLength = Number.parseInt(match[1], 10);
    }

    if (buffer.length < expectedContentLength) {
      return;
    }

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
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: "mantle-yield-mcp",
            version: "0.1.0",
          },
        });
        return;
      case "notifications/initialized":
        return;
      case "ping":
        sendResult(request.id ?? null, {});
        return;
      case "tools/list":
        sendResult(request.id ?? null, {
          tools: tools.map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema,
          })),
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
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
      structuredContent: result,
      isError: false,
    });
  } catch (error) {
    const gap = toBackendGap(error);
    sendResult(request.id ?? null, {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "error",
              backendGaps: [gap],
            },
            null,
            2,
          ),
        },
      ],
      structuredContent: {
        status: "error",
        backendGaps: [gap],
      },
      isError: true,
    });
  }
}

function sendResult(id: JsonRpcId, result: unknown): void {
  writeMessage({
    jsonrpc: "2.0",
    id,
    result,
  });
}

function sendError(id: JsonRpcId, code: number, message: string): void {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  });
}

function writeMessage(payload: unknown): void {
  const body = JSON.stringify(payload);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

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
  return value;
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

logger.info("Mantle Yield MCP server started", {
  apiBaseUrl: env.apiBaseUrl,
  port: env.port,
});
