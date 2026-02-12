import { getNeonTools } from "@/lib/ai/mcp/neon";
import { getGitHubTools } from "@/lib/ai/mcp/github";
import { getVercelTools } from "@/lib/ai/mcp/vercel";
import { getNotionTools } from "@/lib/ai/mcp/notion";
import { getTerraformTools } from "@/lib/ai/mcp/terraform";
import { getAWSTools } from "@/lib/ai/mcp/aws";
import { getExaTools } from "@/lib/ai/mcp/exa";
import { getAlphaVantageTools } from "@/lib/ai/mcp/alphavantage";
import { getGoogleMapsTools } from "@/lib/ai/mcp/google-maps";
import { getStripeTools } from "@/lib/ai/mcp/stripe";
import { getLinearTools } from "@/lib/ai/mcp/linear";

const directTools = [
  {
    id: "getWeather",
    name: "Weather",
    description:
      "Get the current weather at a location. Accepts either GPS coordinates (latitude/longitude) or a city name, which is geocoded via Open-Meteo. Returns temperature, wind speed, conditions, and a 5-day forecast.",
    category: "Built-in",
  },
  {
    id: "getBaronLocation",
    name: "Baron Location",
    description:
      "Get Baron's current live location from the Upstash Redis telemetry stream. Returns latitude, longitude, a human-readable address via reverse geocoding, and how long ago the location was recorded.",
    category: "Built-in",
  },
  {
    id: "queryWolframAlpha",
    name: "Wolfram Alpha",
    description:
      "Query Wolfram Alpha for math, science, data analysis, unit conversions, equations, statistics, and factual computations. Supports integrals, derivatives, GDP comparisons, unit conversion, chemical formulas, and any question that benefits from computational knowledge.",
    category: "Built-in",
  },
  {
    id: "executeCode",
    name: "Code Sandbox",
    description:
      "Execute Python code in a secure, isolated E2B cloud sandbox. Use for calculations, data analysis, file processing, plotting with matplotlib/seaborn, or any arbitrary code execution task. Returns stdout, stderr, and execution results.",
    category: "Built-in",
  },
  {
    id: "createDocument",
    name: "Create Document",
    description:
      "Create a new document artifact for writing or content creation. Supports multiple artifact kinds (text, code, spreadsheet, image). Generates a unique ID, streams the document into the chat via a data stream, and persists it to the database.",
    category: "Built-in",
  },
  {
    id: "updateDocument",
    name: "Update Document",
    description:
      "Update an existing document artifact by ID with a natural-language description of the changes to make. Looks up the document in the database, applies the described modifications through the appropriate artifact handler, and streams the updated content back.",
    category: "Built-in",
  },
  {
    id: "requestSuggestions",
    name: "Suggestions",
    description:
      "Request AI-generated writing suggestions for an existing document artifact. Analyzes the document content and streams back inline improvement suggestions (insertions, deletions, replacements) with original text, suggested text, and descriptions of each change.",
    category: "Built-in",
  },
];

interface McpServerDef {
  key: string;
  label: string;
  env: string;
  fetch: () => Promise<{ tools: Record<string, { description?: string }>; toolNames: string[]; cleanup: () => Promise<void> }>;
}

const mcpServers: McpServerDef[] = [
  { key: "linear", label: "Linear", env: "LINEAR_API_KEY", fetch: getLinearTools },
  { key: "stripe", label: "Stripe", env: "STRIPE_SECRET_KEY", fetch: getStripeTools },
  { key: "github", label: "GitHub", env: "GITHUB_PERSONAL_ACCESS_TOKEN", fetch: getGitHubTools },
  { key: "notion", label: "Notion", env: "NOTION_MCP_TOKEN", fetch: getNotionTools },
  { key: "vercel", label: "Vercel", env: "VERCEL_MCP_TOKEN", fetch: getVercelTools },
  { key: "neon", label: "Neon", env: "NEON_API_KEY", fetch: getNeonTools },
  { key: "googleMaps", label: "Google Maps", env: "GOOGLE_MAPS_API_KEY", fetch: getGoogleMapsTools },
  { key: "exa", label: "Exa Search", env: "EXA_API_KEY", fetch: getExaTools },
  { key: "alphaVantage", label: "Alpha Vantage", env: "ALPHA_VANTAGE_API_KEY", fetch: getAlphaVantageTools },
  { key: "aws", label: "AWS", env: "AWS_MCP_URL", fetch: getAWSTools },
  { key: "terraform", label: "Terraform", env: "TERRAFORM_MCP_URL", fetch: getTerraformTools },
];

export async function GET() {
  const activeServers = mcpServers.filter((s) => !!process.env[s.env]);

  const results = await Promise.all(
    activeServers.map(async (server) => {
      try {
        const result = await server.fetch();
        const tools = Object.entries(result.tools).map(([toolName, tool]) => ({
          id: `${server.key}_${toolName}`,
          name: toolName,
          description: (tool as any).description ?? "",
          server: server.label,
        }));
        await result.cleanup();
        return tools;
      } catch {
        return [];
      }
    })
  );

  const mcpTools = results.flat();

  return Response.json({ tools: directTools, mcpTools });
}
