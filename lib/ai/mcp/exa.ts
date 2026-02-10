import { createMCPClient } from "@ai-sdk/mcp";

export async function getExaTools() {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return { tools: {}, toolNames: [], cleanup: async () => {} };

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: `https://mcp.exa.ai/mcp?exaApiKey=${apiKey}`,
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
    console.error("Failed to connect to Exa MCP server:", error);
    return { tools: {}, toolNames: [], cleanup: async () => {} };
  }
}
