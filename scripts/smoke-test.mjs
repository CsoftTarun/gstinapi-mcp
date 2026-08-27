import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "index.js");

const transport = new StdioClientTransport({
  command: "node",
  args: [serverPath],
  env: { GSTINAPI_API_KEY: process.env.GSTINAPI_API_KEY, PATH: process.env.PATH },
});

const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("TOOL_COUNT", tools.tools.length);
console.log("TOOL_NAMES", tools.tools.map(t => t.name).join(","));

// A known-good demo GSTIN commonly used across the site's own docs/guides.
const result = await client.callTool({
  name: "verify_gstin",
  arguments: { gstin: "27AAPFU0939F1ZV" },
});
console.log("VERIFY_RESULT", JSON.stringify(result, null, 2));

const badKeyCheck = await client.callTool({
  name: "get_usage_stats",
  arguments: {},
});
console.log("STATS_RESULT", JSON.stringify(badKeyCheck, null, 2));

const hsn = await client.callTool({
  name: "search_hsn_codes",
  arguments: { query: "cotton", limit: 3 },
});
console.log("HSN_RESULT", JSON.stringify(hsn, null, 2));

await client.close();
process.exit(0);
