// @cultmath/agent-tools/langchain — CULT+MATH research and paid runs as LangChain tools.
// CULT+MATH · November 11, 2026 · © 2026 Ipalibo Da-Wariboko · MIT
import { toolSpecs } from './client.js';

/**
 * const tools = await createCultMathTools({ fetch: paymentFetch, maxPriceUsd: 1 });
 * Peer dependency: @langchain/core (tool() with a JSON schema).
 */
export async function createCultMathTools(options = {}) {
  const tool = options.tool || (await import('@langchain/core/tools')).tool;
  const specs = await toolSpecs(options);
  return specs.map((s) => tool(
    async (args) => {
      const out = await s.execute(args);
      return typeof out === 'string' ? out : JSON.stringify(out);
    },
    { name: s.name, description: s.description, schema: s.schema },
  ));
}

export { createClient } from './client.js';
