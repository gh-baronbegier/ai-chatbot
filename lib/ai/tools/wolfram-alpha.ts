import { tool } from "ai";
import { z } from "zod";

export const queryWolframAlpha = tool({
  description:
    "Query Wolfram Alpha for math, science, data analysis, unit conversions, equations, statistics, and factual computations. Use this for any question that benefits from computational knowledge.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The query to send to Wolfram Alpha (e.g., 'integrate x^2 sin(x)', 'GDP of France vs Germany', '150 lbs in kg')"
      ),
  }),
  execute: async ({ query }) => {
    const appId = process.env.WOLFRAM_APP_ID;
    if (!appId) {
      return { error: "Wolfram Alpha is not configured (missing WOLFRAM_APP_ID)." };
    }

    try {
      const response = await fetch(
        `https://api.wolframalpha.com/v2/query?input=${encodeURIComponent(query)}&format=plaintext&output=JSON&appid=${appId}`
      );

      if (!response.ok) {
        return { error: `Wolfram Alpha API error: ${response.status}` };
      }

      const data = await response.json();
      const result = data.queryresult;

      if (!result.success) {
        return {
          error: "Wolfram Alpha could not interpret this query.",
          suggestions: result.didyoumeans?.val,
        };
      }

      const pods = (result.pods || []).map(
        (pod: { title: string; subpods: { plaintext: string }[] }) => ({
          title: pod.title,
          content: pod.subpods
            ?.map((s: { plaintext: string }) => s.plaintext)
            .filter(Boolean)
            .join("\n"),
        })
      );

      return { query, pods };
    } catch (error) {
      return { error: `Failed to query Wolfram Alpha: ${error}` };
    }
  },
});
