# Mantle Yield MCP

A standalone TypeScript MCP server for the Mantle Yield Workspace backend.

This project is intentionally separate from the dashboard/frontend repository and talks to the backend only through HTTP API endpoints.

## Implemented tools

- `mantle_get_dashboard_summary`
- `mantle_list_opportunities`
- `mantle_get_opportunity_details`
- `mantle_compare_opportunities`
- `mantle_get_sync_status`
- `mantle_get_available_filters`
- `mantle_get_protocols`

## Environment variables

- `MANTLE_YIELD_API_BASE_URL` — required backend base URL, for example `https://mantle-yield.asterworks.cc`
- `MANTLE_YIELD_API_TOKEN` — optional bearer token
- `MANTLE_YIELD_API_TIMEOUT_MS` — HTTP timeout in milliseconds, default `10000`
- `PORT` — service port metadata, default `4001`
- `NODE_ENV` — runtime environment
- `LOG_LEVEL` — `debug|info|warn|error`

See `.env.example` for a minimal configuration.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

The server runs as MCP over stdio.
For development it uses `node --experimental-strip-types`.
For production it builds with `tsc`.

## Production run

```bash
npm install
npm run build
npm run start
```

## MCP connection example

Example stdio configuration:

```json
{
  "mcpServers": {
    "mantle-yield": {
      "command": "node",
      "args": [
        "--env-file=.env",
        "dist/index.js"
      ],
      "cwd": "./mantle-yield-mcp"
    }
  }
}
```

If your MCP host does not support `cwd`, use absolute paths in your local/private deployment config only, not in public documentation.

## Backend endpoints used

Fully used:

- `GET /api/summary`
- `GET /api/opportunities`
- `GET /api/opportunities/:id`
- `GET /api/health`

Expected but currently absent in the backend:

- `GET /api/filters`
- `GET /api/protocols`

## Backend gaps found

- No dedicated filters endpoint. `mantle_get_available_filters` falls back to deriving filters from `GET /api/opportunities` and reports a `missing_endpoint` backend gap.
- No dedicated protocols endpoint. `mantle_get_protocols` falls back to deriving protocol data from `GET /api/opportunities` and reports a `missing_endpoint` backend gap.
- `GET /api/opportunities/:id` currently matches the list item shape. If that contract changes, the MCP server will return `invalid_payload_shape` or `inconsistent_backend_contract` instead of masking the problem.

## Fully ready methods

- `fetchSummary()`
- `fetchOpportunities(params)`
- `fetchOpportunityDetails(id)`
- `fetchSyncStatus()`

## Temporarily limited methods

- `fetchAvailableFilters()` — limited by missing `GET /api/filters`
- `fetchProtocols()` — limited by missing `GET /api/protocols`

## Error handling

The server does not hide backend problems.
It returns explicit error/gap codes such as:

- `missing_endpoint`
- `missing_field`
- `invalid_payload_shape`
- `inconsistent_backend_contract`
- `http_error`
- `timeout`
- `not_found`

## Status

READY FOR GIT PUSH
