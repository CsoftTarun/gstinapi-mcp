# gstinapi-mcp

An [MCP](https://modelcontextprotocol.io) server for [gstinapi.in](https://www.gstinapi.in) — GSTIN verification, GST return/compliance history and HSN/SAC code lookup, callable directly from Claude and other MCP clients.

This is a thin wrapper around the REST API at [gstinapi.in/docs](https://www.gstinapi.in/docs). It holds no logic of its own — every tool call is one authenticated HTTP request, and the response is returned as-is.

## Setup

1. Get a free API key — up to 100 free lookups (25 on signup, 25 for each of three setup steps), no card required: https://www.gstinapi.in/register
2. Add this server to your MCP client config, e.g. for Claude Desktop / Claude Code (`claude_desktop_config.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "gstinapi": {
      "command": "npx",
      "args": ["-y", "gstinapi-mcp"],
      "env": {
        "GSTINAPI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

No install step — `npx` fetches it on first use.

## Tools

| Tool | What it does |
|---|---|
| `verify_gstin` | Live registration lookup: legal name, status, taxpayer type, address |
| `get_gstin_returns` | GSTR-1/3B filing history for a financial year |
| `get_gstin_compliance` | Filing history summarised — counts, lag, last period |
| `get_gstin_filing_preference` | Monthly vs quarterly (QRMP), quarter by quarter |
| `lookup_hsn_code` | Official description for an HSN/SAC code |
| `search_hsn_codes` | Find HSN/SAC codes from a description |
| `get_usage_stats` | Today's call count for the key (free) |

Full field-level reference: https://www.gstinapi.in/docs

## Accuracy notes

- Every GSTIN lookup queries the GST network live — nothing is cached.
- No GST rate is returned from the HSN endpoints — a rate depends on more than the code alone, and the government's own master publishes no rate column.

## Billing

Pay-per-use credits on your gstinapi.in account, no separate charge for this MCP server. Pricing: https://www.gstinapi.in/pricing

## License

MIT
