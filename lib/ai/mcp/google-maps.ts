import { createMCPClient } from "@ai-sdk/mcp";

export async function getGoogleMapsTools() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { tools: {}, toolNames: [], cleanup: async () => {} };

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: "https://mapstools.googleapis.com/mcp",
        headers: {
          "X-Goog-Api-Key": apiKey,
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
    console.error("Failed to connect to Google Maps MCP server:", error);
    return { tools: {}, toolNames: [], cleanup: async () => {} };
  }
}
