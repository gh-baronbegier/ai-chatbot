import { createMCPClient } from "@ai-sdk/mcp";

export async function getStripeTools() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) return { tools: {}, toolNames: [], cleanup: async () => {} };

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: "https://mcp.stripe.com",
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
    console.error("Failed to connect to Stripe MCP server:", error);
    return { tools: {}, toolNames: [], cleanup: async () => {} };
  }
}
