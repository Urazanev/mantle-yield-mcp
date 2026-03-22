# Mantle Yield MCP

Universal MCP server for Mantle yield data, backed by the Mantle Yield API at `https://mantle-yield.asterworks.cc`.

It is designed to work with any MCP client that can launch a local process over `stdio`, including terminal agents and editor-based MCP hosts.

## What it provides

- `mantle_get_health` — backend health status
- `mantle_get_summary` — dashboard summary
- `mantle_list_opportunities` — list opportunities with filters, sorting, and pagination
- `mantle_get_opportunity` — full details for a single opportunity
- `mantle_get_opportunity_chart` — APY / TVL chart data for one opportunity
- `mantle_compare_opportunities` — side-by-side comparison for 2–3 opportunities
- `mantle_refresh_data` — trigger backend refresh

## Requirements

- Node.js `>= 22`
- npm

## Install

```bash
git clone https://github.com/Urazanev/mantle-yield-mcp.git
cd mantle-yield-mcp
npm install
npm run build
```

No `.env` file is required for the default setup.

## Run locally

```bash
npm start
```

If the process stays open, the server is waiting for an MCP client on `stdin` / `stdout`.

## Universal MCP setup

Most MCP clients ultimately need the same runtime information:

- executable command
- absolute path to the built server entrypoint
- optional environment variables

Use this runtime shape in your MCP client configuration, adapting only the outer JSON structure to your client:

```json
{
  "name": "mantle-yield",
  "type": "stdio",
  "command": "node",
  "args": [
    "/ABSOLUTE/PATH/TO/mantle-yield-mcp/dist/index.js"
  ]
}
```

Replace `/ABSOLUTE/PATH/TO/mantle-yield-mcp/dist/index.js` with the real absolute path on your machine.

## Integration notes

- Use an absolute path to `dist/index.js`.
- Prefer launching `node` directly.
- Do not use `npm start`, `npx`, or other wrappers as the MCP command, because wrapper output can break the MCP handshake.
- The server supports both common local stdio framing styles used by MCP hosts:
  - `Content-Length` framed JSON-RPC
  - newline-delimited JSON-RPC

## Environment variables

All environment variables are optional.

| Variable | Default | Description |
|---|---|---|
| `MANTLE_YIELD_API_BASE_URL` | `https://mantle-yield.asterworks.cc` | Override backend API base URL |
| `MANTLE_YIELD_API_TOKEN` | unset | Optional bearer token |
| `MANTLE_YIELD_API_TIMEOUT_MS` | `10000` | HTTP timeout in milliseconds |

## Development

```bash
npm run dev
```

or

```bash
npm run dev:tsx
```

## Troubleshooting

- Rebuild after code changes: `npm run build`
- If a client hangs on `initialize`, verify it launches `node /absolute/path/to/dist/index.js` directly

## Notes

- Uses only the Mantle Yield backend API as its data source
- Does not call DefiLlama directly
- Does not parse HTML or read local snapshot files
- Does not execute on-chain transactions
