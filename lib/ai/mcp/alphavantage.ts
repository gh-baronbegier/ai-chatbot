import { createMCPClient } from "@ai-sdk/mcp";

export async function getAlphaVantageTools() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return { tools: {}, toolNames: [], cleanup: async () => {} };

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: `https://mcp.alphavantage.co/mcp?apikey=${apiKey}`,
      },
    });

    const tools = await client.tools();
    const toolNames = Object.keys(tools);

    return {
      tools,
      toolNames,
      cleanup: () => client.close(),
    };
  } catch (error) {
    console.error("Failed to connect to Alpha Vantage MCP server:", error);
    return { tools: {}, toolNames: [], cleanup: async () => {} };
  }
}
