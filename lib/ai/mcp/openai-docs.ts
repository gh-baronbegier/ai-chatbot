import { createMCPClient } from "@ai-sdk/mcp";

export async function getOpenAIDocsTools() {
  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: "https://developers.openai.com/mcp",
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
    console.error("Failed to connect to OpenAI Docs MCP server:", error);
    return { tools: {}, toolNames: [], cleanup: async () => {} };
  }
}
