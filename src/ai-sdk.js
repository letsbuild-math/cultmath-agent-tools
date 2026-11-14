// @cultmath/agent-tools/ai-sdk — CULT+MATH research and paid runs as Vercel AI SDK tools.
// CULT+MATH · November 11, 2026 · © 2026 Ipalibo Da-Wariboko · MIT
import { toolSpecs } from './client.js';

/**
 * const tools = await createCultMathTools({ fetch: paymentFetch, maxPriceUsd: 1 });
 * await generateText({ model, tools, prompt });
 * Peer dependency: ai (tool() and jsonSchema()). Works with AI SDK 4 (parameters) and 5+ (inputSchema).
 */
export async function createCultMathTools(options = {}) {
  const ai = options.ai || (await import('ai'));
  const specs = await toolSpecs(options);
  const tools = {};
  for (const s of specs) {
    const schema = ai.jsonSchema(s.schema);
    tools[s.name] = ai.tool({ description: s.description, inputSchema: schema, parameters: schema, execute: (args) => s.execute(args) });
  }
  return tools;
}

export { createClient } from './client.js';
