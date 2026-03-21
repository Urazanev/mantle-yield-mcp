# Mantle Yield MCP

A standalone TypeScript MCP server for the Mantle Yield Workspace.

It acts as a thin wrapper over the Mantle Yield backend API — no direct DefiLlama calls, no HTML parsing, no local snapshot files.

**Dashboard:** https://mantle-yield.asterworks.cc  
**Backend API base:** https://mantle-yield.asterworks.cc

---

## Tool reference

### `mantle_get_health`
Returns technical health status of the backend service.

Calls `GET /api/health`.

**Arguments:** none

**Returns:**
```json
{
  "status": "ok",
  "data": {
    "status": "Healthy",
    "lastSync": "2026-03-21T17:27:16.934Z",
    "sourcesRefreshed": 1,
    "failedSources": []
  },
  "backendGaps": []
}
```

---

### `mantle_get_summary`
Returns the dashboard summary.

Calls `GET /api/summary`.

**Arguments:** none

**Returns:**
```json
{
  "status": "ok",
  "data": {
    "opportunitiesTracked": 28,
    "protocols": 11,
    "assetsIndexed": 13,
    "lastSync": "2026-03-21T17:27:16.934Z",
    "status": "Healthy"
  },
  "backendGaps": []
}
```

---

### `mantle_list_opportunities`
Returns a filtered, paginated list of yield opportunities.

Calls `GET /api/opportunities`.

**Arguments (all optional):**

| Argument | Type | Description |
|---|---|---|
| `asset` | string | Filter by asset symbol, e.g. `USDT` |
| `strategy` | string | Filter by strategy type, e.g. `Lending` |
| `complexity` | string | `Low`, `Med`, or `High` |
| `lockup` | string | `none` or `has` |
| `exposure` | string | Filter by exposure type |
| `sort` | string | `apy_desc`, `apy_asc`, `tvl_desc`, `tvl_asc`, `protocol_az` |
| `page` | number | Page number (1-based) |
| `limit` | number | Items per page (max 200) |

---

### `mantle_get_opportunity`
Returns full details for a single opportunity.

Calls `GET /api/opportunities/:id`.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | string (UUID) | ✅ |

---

### `mantle_get_opportunity_chart`
Returns historical APY/TVL chart data for an opportunity.

Calls `GET /api/opportunities/:id/chart`.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | string (UUID) | ✅ |

**Returns:**
```json
{
  "status": "ok",
  "data": {
    "chart": [{ "timestamp": "...", "apy": 5.4, "tvlUsd": 123456 }],
    "tvlUsd": 123456,
    "apy": 5.4,
    "updated": "2026-03-21T17:27:16.934Z"
  },
  "backendGaps": []
}
```

---

### `mantle_compare_opportunities`
Compares 2 or 3 opportunities side-by-side.

Fetches each opportunity via `GET /api/opportunities/:id` and returns a unified comparison structure.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `ids` | string[] (2–3 UUIDs) | ✅ |

**Returns** a unified comparison structure with fields: `id`, `protocolName`, `strategyType`, `assetSymbol`, `apy`, `apyBase`, `apyReward`, `tvlUsd`, `exposureType`, `complexity`, `lockupLabel`, `updatedAt`.

---

### `mantle_refresh_data`
Triggers a manual data refresh on the backend.

Calls `POST /api/refresh`.

**Arguments:** none

**Returns:**
```json
{
  "status": "ok",
  "data": { "message": "Refresh started." },
  "backendGaps": []
}
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MANTLE_YIELD_API_BASE_URL` | ✅ | — | Backend base URL, e.g. `https://mantle-yield.asterworks.cc` |
| `MANTLE_YIELD_API_TOKEN` | — | — | Bearer token (optional, for future auth) |
| `MANTLE_YIELD_API_TIMEOUT_MS` | — | `10000` | HTTP timeout in milliseconds |
| `PORT` | — | `4001` | Port metadata (not a listening port — server runs over stdio) |
| `NODE_ENV` | — | `development` | Runtime environment |
| `LOG_LEVEL` | — | `info` | Log level: `debug`, `info`, `warn`, `error` |

See `.env.example` for a ready-to-copy template.

---

## Local development

```bash
npm install
cp .env.example .env
# Edit .env if needed
npm run dev
```

The server communicates over **stdio** using the MCP protocol (JSON-RPC 2.0 with `Content-Length` framing). It does not open any TCP port.

`npm run dev` uses `node --watch --import=tsx/esm` for fast iteration without a separate compile step.

---

## Production run

```bash
npm install
npm run build    # compiles TypeScript → dist/
npm run start    # node --env-file=.env dist/index.js
```

---

## MCP client configuration

Example `mcpServers` config for Cursor / Claude Desktop / similar hosts:

```json
{
  "mcpServers": {
    "mantle-yield": {
      "command": "node",
      "args": ["--env-file=.env", "dist/index.js"],
      "cwd": "/absolute/path/to/mantle-yield-mcp"
    }
  }
}
```

For development (no build step):

```json
{
  "mcpServers": {
    "mantle-yield": {
      "command": "node",
      "args": [
        "--env-file=.env",
        "--import=tsx/esm",
        "--no-warnings=ExperimentalWarning",
        "src/index.ts"
      ],
      "cwd": "/absolute/path/to/mantle-yield-mcp"
    }
  }
}
```

---

## Backend source

All data comes exclusively from the Mantle Yield backend API at:

```
https://mantle-yield.asterworks.cc
```

The MCP server does **not**:
- Call DefiLlama directly
- Parse HTML
- Read local snapshot files
- Perform yield calculations
- Give financial advice or recommendations
- Execute any on-chain transactions

---

## Error codes

The server reports structured error codes in `backendGaps` when something goes wrong:

| Code | Meaning |
|---|---|
| `missing_endpoint` | Backend endpoint returns 404 |
| `missing_field` | Required field absent from backend response |
| `invalid_payload_shape` | Response shape doesn't match expected schema |
| `inconsistent_backend_contract` | Response is valid JSON but structurally unexpected |
| `http_error` | Non-404 HTTP error from backend |
| `timeout` | Backend request timed out |
| `not_found` | Specific resource (e.g. opportunity by ID) not found |

---

## Project structure

```
src/
  client/
    apiClient.ts           — HTTP client wrapping all backend endpoints
  schemas/
    opportunity.ts         — Opportunity, SummaryData, OpportunitiesResponse types + parsers
    health.ts              — HealthData type + parser
    chart.ts               — ChartData type + parser
  tools/
    getHealth.ts           — mantle_get_health
    getSummary.ts          — mantle_get_summary
    listOpportunities.ts   — mantle_list_opportunities
    getOpportunity.ts      — mantle_get_opportunity
    getOpportunityChart.ts — mantle_get_opportunity_chart
    compareOpportunities.ts — mantle_compare_opportunities
    refreshData.ts         — mantle_refresh_data
  utils/
    env.ts                 — ENV loading + validation
    logger.ts              — Structured stderr logger
    errors.ts              — Typed error classes + toBackendGap helper
  index.ts                 — MCP server entry point (stdio transport)
```
