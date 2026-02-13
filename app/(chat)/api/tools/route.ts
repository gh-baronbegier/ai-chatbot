export const preferredRegion = "pdx1";

import { MCP_PROVIDERS, createMCPToolset } from "@/lib/ai/mcp/create-mcp-toolset";

const BUILT_IN_TOOLS = [
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
];

export async function GET() {
  const active = MCP_PROVIDERS.filter((p) => !!process.env[p.envKey]);

  const results = await Promise.all(
    active.map(async (provider) => {
      try {
        const result = await createMCPToolset(provider);
        const tools = Object.entries(result.tools).map(([toolName, tool]) => ({
          id: `${provider.name.toLowerCase().replace(/\s+/g, "_")}_${toolName}`,
          name: toolName,
          description: (tool as { description?: string }).description ?? "",
          server: provider.name,
        }));
        await result.cleanup();
        return tools;
      } catch {
        return [];
      }
    }),
  );

  return Response.json({
    tools: BUILT_IN_TOOLS,
    mcpTools: results.flat(),
  });
}
