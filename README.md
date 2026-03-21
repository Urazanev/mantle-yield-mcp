# Mantle Yield MCP

A standalone TypeScript MCP server for the Mantle Yield Workspace.

It acts as a thin wrapper over the Mantle Yield backend API — no direct DefiLlama calls, no HTML parsing, no local snapshot files.

**Dashboard:** https://mantle-yield.asterworks.cc  
**Backend API base:** https://mantle-yield.asterworks.cc

---

## Implemented tools

| Tool | Backend endpoint | Status |
|---|---|---|
| `mantle_get_health` | `GET /api/health` | ✅ Working |
| `mantle_get_summary` | `GET /api/summary` | ✅ Working |
| `mantle_list_opportunities` | `GET /api/opportunities` | ✅ Working |
| `mantle_get_opportunity` | `GET /api/opportunities/:id` | ✅ Working |
| `mantle_get_opportunity_chart` | `GET /api/opportunities/:id/chart` | ⚠️ Backend gap (404) |
| `mantle_compare_opportunities` | `GET /api/opportunities/:id` × N | ✅ Working |
| `mantle_refresh_data` | `POST /api/refresh` | ⚠️ Backend gap (404) |

---

## Tool reference

### `mantle_get_health`
Returns technical status from `GET /api/health`.

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
  "backendGaps": [...]
}
```

> **Backend gap note:** The actual `/api/health` response does not include fields `syncedAt`, `nextRefresh`, `source`, `itemCount`, `fileExists`, `snapshotPath` described in the original spec. The tool returns what the backend actually provides and documents the gap.

---

### `mantle_get_summary`
Returns dashboard summary from `GET /api/summary`.

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
Returns a filtered, paginated list of yield opportunities from `GET /api/opportunities`.

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
Returns full details for a single opportunity from `GET /api/opportunities/:id`.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | string (UUID) | ✅ |

---

### `mantle_get_opportunity_chart`
Returns historical APY/TVL chart data from `GET /api/opportunities/:id/chart`.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | string (UUID) | ✅ |

> **Backend gap:** This endpoint is not yet implemented. The tool returns `status: "backend_gap"` with a clear explanation.

---

### `mantle_compare_opportunities`
Compares 2 or 3 opportunities side-by-side. Fetches each via `GET /api/opportunities/:id`.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `ids` | string[] (2–3 UUIDs) | ✅ |

**Returns** a unified comparison structure with fields: `id`, `protocolName`, `strategyType`, `assetSymbol`, `apy`, `apyBase`, `apyReward`, `tvlUsd`, `exposureType`, `complexity`, `lockupLabel`, `updatedAt`.

---

### `mantle_refresh_data`
Triggers a manual backend data refresh via `POST /api/refresh`.

**Arguments:** none

> **Backend gap:** This endpoint is not yet implemented. The tool returns `status: "backend_gap"` with a clear explanation.

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

`npm run dev` uses `node --experimental-strip-types --watch` for fast iteration without a separate compile step.

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
        "--experimental-strip-types",
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

## Backend gaps found (as of 2026-03-21)

### Gap 1 — `GET /api/health` response shape differs from spec

**Endpoint:** `GET /api/health`

**Spec described:**
```json
{ "status": "ok", "syncedAt": "...", "nextRefresh": "...", "source": "...", "itemCount": 123, "fileExists": true, "snapshotPath": "..." }
```

**Actual response:**
```json
{ "status": "Healthy", "lastSync": "...", "sourcesRefreshed": 1, "failedSources": [] }
```

**Impact:** `mantle_get_health` works and returns real data, but the response shape differs from spec. The gap is reported in the tool output under `backendGaps`.

**Fix needed on backend:** Add `syncedAt`, `nextRefresh`, `source`, `itemCount`, `fileExists`, `snapshotPath` to `/api/health` response.

---

### Gap 2 — `GET /api/opportunities/:id/chart` not implemented

**Endpoint:** `GET /api/opportunities/:id/chart`

**Actual:** HTTP 404 (Next.js not-found page)

**Impact:** `mantle_get_opportunity_chart` returns `status: "backend_gap"`.

**Fix needed on backend:** Implement `GET /api/opportunities/:id/chart` returning `{ chart, tvlUsd, apy, updated }`.

---

### Gap 3 — `POST /api/refresh` not implemented

**Endpoint:** `POST /api/refresh`

**Actual:** HTTP 404 (Next.js not-found page)

**Impact:** `mantle_refresh_data` returns `status: "backend_gap"`.

**Fix needed on backend:** Implement `POST /api/refresh` returning `{ "message": "Refresh started." }`.

---

## Error codes

The server reports structured error codes in `backendGaps`:

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
    apiClient.ts          — HTTP client wrapping all backend endpoints
  schemas/
    opportunity.ts        — Opportunity, SummaryData, OpportunitiesResponse types + parsers
    health.ts             — HealthData type + parser
    chart.ts              — ChartData type + parser
  tools/
    getHealth.ts          — mantle_get_health
    getSummary.ts         — mantle_get_summary
    listOpportunities.ts  — mantle_list_opportunities
    getOpportunity.ts     — mantle_get_opportunity
    getOpportunityChart.ts — mantle_get_opportunity_chart
    compareOpportunities.ts — mantle_compare_opportunities
    refreshData.ts        — mantle_refresh_data
  utils/
    env.ts                — ENV loading + validation
    logger.ts             — Structured stderr logger
    errors.ts             — Typed error classes + toBackendGap helper
  index.ts                — MCP server entry point (stdio transport)
```

---

## Status

BACKEND GAPS FOUND

Missing endpoints (documented above):
- `GET /api/opportunities/:id/chart` — returns 404
- `POST /api/refresh` — returns 404

Response shape mismatch (documented above):
- `GET /api/health` — different fields than spec
