import { createMCPClient } from "@ai-sdk/mcp";

export async function getNotionTools() {
  const token = process.env.NOTION_MCP_TOKEN;
  if (!token) return { tools: {}, toolNames: [], cleanup: async () => {} };

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: "https://mcp.notion.com/mcp",
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
    console.error("Failed to connect to Notion MCP server:", error);
    return { tools: {}, toolNames: [], cleanup: async () => {} };
  }
}
