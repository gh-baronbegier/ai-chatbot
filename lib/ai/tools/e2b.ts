import { tool } from "ai";
import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";

export const executeCode = tool({
  description:
    "Execute Python code in a secure E2B sandbox. Use for calculations, data analysis, file processing, plotting, or any code execution task.",
  inputSchema: z.object({
    code: z.string().describe("The Python code to execute"),
  }),
  execute: async ({ code }) => {
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      return { error: "E2B is not configured (missing E2B_API_KEY)." };
    }
    try {
      const sandbox = await Sandbox.create({ apiKey });
      const execution = await sandbox.runCode(code);
      await sandbox.kill();
      return {
        text: execution.text,
        results: execution.results,
        logs: { stdout: execution.logs.stdout, stderr: execution.logs.stderr },
        error: execution.error ? execution.error.value : null,
      };
    } catch (error) {
      return { error: `E2B execution failed: ${error}` };
    }
  },
});
