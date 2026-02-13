import { createMCPToolset, MCP_PROVIDERS } from "./create-mcp-toolset";

type MCPToolSet = Awaited<ReturnType<typeof createMCPToolset>>;

export async function loadAllMCPTools(): Promise<{
  tools: Record<string, MCPToolSet["tools"][string]>;
  toolNames: string[];
  cleanup: () => Promise<void>;
}> {
  const results = await Promise.all(
    MCP_PROVIDERS.map((config) => createMCPToolset(config))
  );

  const tools: Record<string, MCPToolSet["tools"][string]> = {};
  const toolNames: string[] = [];

  for (const result of results) {
    Object.assign(tools, result.tools);
    toolNames.push(...result.toolNames);
  }

  return {
    tools,
    toolNames,
    async cleanup() {
      await Promise.all(results.map((r) => r.cleanup()));
    },
  };
}
