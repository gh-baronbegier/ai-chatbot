import { createMCPClient } from "@ai-sdk/mcp";

export async function getNeonTools() {
  const apiKey = process.env.NEON_API_KEY;
  if (!apiKey) return { tools: {}, toolNames: [], cleanup: async () => {} };

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: "https://mcp.neon.tech/mcp",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
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
    console.error("Failed to connect to Neon MCP server:", error);
    return { tools: {}, toolNames: [], cleanup: async () => {} };
  }
}
