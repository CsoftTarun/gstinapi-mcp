#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = (process.env.GSTINAPI_BASE_URL || "https://www.gstinapi.in").replace(/\/+$/, "");
const NO_KEY_MESSAGE =
  "GSTINAPI_API_KEY is not set. Get a free key (up to 100 free lookups, no card required) at " +
  "https://www.gstinapi.in/register, then add it to this MCP server's env config.";

// Every tool below is a thin pass-through to the REST API documented at
// https://www.gstinapi.in/docs — this file must never duplicate validation
// or business logic that already lives server-side, or the two will drift.
async function callApi(pathAndQuery) {
  const key = process.env.GSTINAPI_API_KEY;
  if (!key) return { isError: true, text: NO_KEY_MESSAGE };

  let res;
  try {
    res = await fetch(`${BASE_URL}${pathAndQuery}`, { headers: { "x-api-key": key } });
  } catch (err) {
    return { isError: true, text: `Could not reach gstinapi.in: ${err.message}` };
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error || `Request failed with status ${res.status}`;
    return { isError: true, text: msg };
  }
  return { isError: false, text: JSON.stringify(data, null, 2) };
}

const gstin = () =>
  z.string().trim().length(15).transform(s => s.toUpperCase())
    .describe("15-character GSTIN, e.g. 27AAPFU0939F1ZV");
const financialYear = () =>
  z.string().regex(/^\d{4}-\d{2}$/).describe("Financial year as YYYY-YY, e.g. 2025-26");

const TOOLS = [
  {
    name: "verify_gstin",
    title: "Verify a GSTIN",
    description:
      "Look up the live GST registration for a GSTIN: legal name, trade name, status, " +
      "taxpayer type, constitution of business, registration date, and registered address. " +
      "Every call queries the GST network in real time — nothing is served from a cache. " +
      "Set include_profile for jurisdiction codes, e-invoicing status, nature of business, " +
      "and additional places of business at no extra cost.",
    schema: { gstin: gstin(), include_profile: z.boolean().optional() },
    path: ({ gstin, include_profile }) => `/v1/gstin/${gstin}${include_profile ? "?include=profile" : ""}`,
  },
  {
    name: "get_gstin_returns",
    title: "Get GST return filing history",
    description:
      "Every GSTR-1 / GSTR-3B (and other type) return a GSTIN filed in the given financial year, " +
      "with period, filing date, status, and ARN.",
    schema: { gstin: gstin(), financial_year: financialYear() },
    path: ({ gstin, financial_year }) => `/v1/gstin/${gstin}/returns?fy=${encodeURIComponent(financial_year)}`,
  },
  {
    name: "get_gstin_compliance",
    title: "Get GST filing compliance summary",
    description:
      "The return filing history summarised per return type: filed count, last period filed, " +
      "months since it, and average filing lag from period end. Facts only — no on-time " +
      "percentage or defaulter flag is computed; apply your own thresholds, keeping in mind a " +
      "quarterly (QRMP) filer legitimately shows multi-month gaps.",
    schema: { gstin: gstin(), financial_year: financialYear() },
    path: ({ gstin, financial_year }) => `/v1/gstin/${gstin}/compliance?fy=${encodeURIComponent(financial_year)}`,
  },
  {
    name: "get_gstin_filing_preference",
    title: "Get monthly vs quarterly filing preference",
    description: "Whether the taxpayer files Monthly or Quarterly (QRMP), quarter by quarter, for the given financial year.",
    schema: { gstin: gstin(), financial_year: financialYear() },
    path: ({ gstin, financial_year }) => `/v1/gstin/${gstin}/filing-preference?fy=${encodeURIComponent(financial_year)}`,
  },
  {
    name: "lookup_hsn_code",
    title: "Look up an HSN/SAC code",
    description: "The official description for a 2-8 digit HSN (goods) or SAC (services) code, plus the chapter/heading/subheading it sits under. No GST rate is returned — the government's own master publishes no rate column, and a rate depends on more than the code alone.",
    schema: { code: z.string().regex(/^\d{2,8}$/).describe("2-8 digit HSN or SAC code") },
    path: ({ code }) => `/v1/hsn/${code}`,
  },
  {
    name: "search_hsn_codes",
    title: "Search HSN/SAC codes by description",
    description: "Find HSN/SAC codes from a free-text description. Exact code matches rank first, then descriptions starting with the term, then descriptions containing it.",
    schema: {
      query: z.string().min(2).describe("Search text, e.g. 'cotton' — at least 2 characters"),
      kind: z.enum(["hsn", "sac"]).optional().describe("Restrict to goods (hsn) or services (sac)"),
      limit: z.number().int().min(1).max(50).optional(),
    },
    path: ({ query, kind, limit }) => {
      const p = new URLSearchParams({ q: query });
      if (kind) p.set("kind", kind);
      if (limit) p.set("limit", String(limit));
      return `/v1/hsn/search?${p.toString()}`;
    },
  },
  {
    name: "get_usage_stats",
    title: "Get today's usage for this API key",
    description: "How many calls this API key has made today. Free — does not consume a credit.",
    schema: {},
    path: () => `/v1/gstin/stats/me`,
  },
];

const server = new McpServer({ name: "gstinapi", version: "1.0.2" });

for (const t of TOOLS) {
  server.tool(t.name, t.description, t.schema, async (args) => {
    const { isError, text } = await callApi(t.path(args));
    return { content: [{ type: "text", text }], isError };
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
