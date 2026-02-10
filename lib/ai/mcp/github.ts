import { createMCPClient } from "@ai-sdk/mcp";

export async function getGitHubTools() {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) return { tools: {}, toolNames: [], cleanup: async () => {} };

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
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
    console.error("Failed to connect to GitHub MCP server:", error);
    return { tools: {}, toolNames: [], cleanup: async () => {} };
  }
}
