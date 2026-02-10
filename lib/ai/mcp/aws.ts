import { createMCPClient } from "@ai-sdk/mcp";

export async function getAWSTools() {
  const url = process.env.AWS_MCP_URL;
  if (!url) return { tools: {}, toolNames: [], cleanup: async () => {} };

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url,
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
    console.error("Failed to connect to AWS MCP server:", error);
    return { tools: {}, toolNames: [], cleanup: async () => {} };
  }
}
