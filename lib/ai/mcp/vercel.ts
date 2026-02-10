import { createMCPClient } from "@ai-sdk/mcp";

export async function getVercelTools() {
  const token = process.env.VERCEL_MCP_TOKEN;
  if (!token) return { tools: {}, toolNames: [], cleanup: async () => {} };

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: "https://mcp.vercel.com",
        headers: {
          Authorization: `Bearer ${token}`,
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
    console.error("Failed to connect to Vercel MCP server:", error);
    return { tools: {}, toolNames: [], cleanup: async () => {} };
  }
}
