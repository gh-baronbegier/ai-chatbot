import { createMCPClient } from "@ai-sdk/mcp";

type MCPToolResult = {
  tools: Record<string, any>;
  toolNames: string[];
  cleanup: () => Promise<void>;
};

const EMPTY_RESULT: MCPToolResult = {
  tools: {},
  toolNames: [],
  cleanup: async () => {},
};

type MCPProviderConfig = {
  name: string;
  envKey: string;
  url: string | ((key: string) => string);
  headers?: (key: string) => Record<string, string>;
};

export async function createMCPToolset(
  config: MCPProviderConfig
): Promise<MCPToolResult> {
  const envValue = process.env[config.envKey];
  if (!envValue) return EMPTY_RESULT;

  try {
    const url =
      typeof config.url === "function" ? config.url(envValue) : config.url;
    const headers = config.headers?.(envValue);

    const client = await createMCPClient({
      transport: {
        type: "http",
        url,
        ...(headers ? { headers } : {}),
      },
    });

    const tools = await client.tools();
    const toolNames = Object.keys(tools);

    return { tools, toolNames, cleanup: () => client.close() };
  } catch (error) {
    console.error(`Failed to connect to ${config.name} MCP server:`, error);
    return EMPTY_RESULT;
  }
}

const bearerAuth = (key: string) => ({ Authorization: `Bearer ${key}` });

export const MCP_PROVIDERS: MCPProviderConfig[] = [
  {
    name: "Neon",
    envKey: "NEON_API_KEY",
    url: "https://mcp.neon.tech/mcp",
    headers: bearerAuth,
  },
  {
    name: "GitHub",
    envKey: "GITHUB_PERSONAL_ACCESS_TOKEN",
    url: "https://api.githubcopilot.com/mcp/",
    headers: bearerAuth,
  },
  {
    name: "Vercel",
    envKey: "VERCEL_MCP_TOKEN",
    url: "https://mcp.vercel.com",
    headers: bearerAuth,
  },
  {
    name: "Notion",
    envKey: "NOTION_MCP_TOKEN",
    url: "https://mcp.notion.com/mcp",
    headers: bearerAuth,
  },
  {
    name: "Terraform",
    envKey: "TERRAFORM_MCP_URL",
    url: (envValue) => envValue,
  },
  {
    name: "AWS",
    envKey: "AWS_MCP_URL",
    url: (envValue) => envValue,
  },
  {
    name: "Exa",
    envKey: "EXA_API_KEY",
    url: (apiKey) => `https://mcp.exa.ai/mcp?exaApiKey=${apiKey}`,
  },
  {
    name: "Alpha Vantage",
    envKey: "ALPHA_VANTAGE_API_KEY",
    url: (apiKey) => `https://mcp.alphavantage.co/mcp?apikey=${apiKey}`,
  },
  {
    name: "Google Maps",
    envKey: "GOOGLE_MAPS_API_KEY",
    url: "https://mapstools.googleapis.com/mcp",
    headers: (apiKey) => ({ "X-Goog-Api-Key": apiKey }),
  },
  {
    name: "Stripe",
    envKey: "STRIPE_SECRET_KEY",
    url: "https://mcp.stripe.com",
    headers: bearerAuth,
  },
  {
    name: "Linear",
    envKey: "LINEAR_API_KEY",
    url: "https://mcp.linear.app/mcp",
    headers: bearerAuth,
  },
];
