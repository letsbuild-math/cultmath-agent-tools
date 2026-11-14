// Tests for @cultmath/agent-tools: the spend cap, the no-wallet path, the description rewrite, and both
// adapters built through injected framework functions (so the tests need no packages installed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, toolSpecs, recipeOf, priceFromHeader, describeForAgent, FREE_TOOLS } from '../src/client.js';
import { createCultMathTools as langchainTools } from '../src/langchain.js';
import { createCultMathTools as aiSdkTools } from '../src/ai-sdk.js';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
const offer = (cents) => b64({ x402Version: 2, accepts: [{ scheme: 'exact', network: 'eip155:8453', amount: String(cents * 10_000) }] });
const MCP_TOOLS = [
  { name: 'search_cultmath', description: 'Search.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'buy_decision_evidence', description: 'Session flow.', inputSchema: { type: 'object', properties: {} } },
  { name: 'run_answer_share_quick', description: 'Who owns the answer? This tool charges nothing: it validates the request and returns a payment_url, the price and instructions. Pay by POSTing to payment_url over MPP (HTTP 402, a Stripe shared payment token from your wallet). Price: $0.74.', inputSchema: { type: 'object', properties: { q1: { type: 'string' }, q2: { type: 'string' } }, required: ['q1', 'q2'], additionalProperties: false } },
  { name: 'run_answer_share', description: 'Full run.', inputSchema: { type: 'object', properties: { q1: { type: 'string' } } } },
];
const TERMS = 'Fixed price per run, not per answer.';

function fakeServer({ prices = { 'answer-share-quick': 74, 'answer-share': 220 }, calls = [] } = {}) {
  return async (url, init = {}) => {
    const u = new URL(url);
    calls.push({ path: u.pathname, body: init.body, headers: init.headers });
    if (u.pathname === '/mcp') {
      const req = JSON.parse(init.body);
      if (req.method === 'tools/list') return new Response(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { tools: MCP_TOOLS } }));
      if (req.method === 'tools/call') return new Response(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: `results for ${req.params.arguments.query}` }] } }));
    }
    const recipe = u.pathname.replace('/run/', '');
    if (init.body === '{}') return new Response(JSON.stringify({ error: 'Payment required.', terms: TERMS }), { status: 402, headers: { 'payment-required': offer(prices[recipe]) } });
    return new Response(JSON.stringify({ error: 'unpaid' }), { status: 402 });
  };
}
async function withFetch(f, fn) { const real = globalThis.fetch; globalThis.fetch = f; try { return await fn(); } finally { globalThis.fetch = real; } }

test('recipe names and prices are read correctly', () => {
  assert.equal(recipeOf('run_answer_share_quick'), 'answer-share-quick');
  assert.equal(recipeOf('search_cultmath'), null);
  assert.equal(priceFromHeader(offer(74)), 0.74);
  assert.equal(priceFromHeader('not base64 json'), null);
});

test('only https base URLs, and a positive spend cap', () => {
  assert.throws(() => createClient({ baseUrl: 'http://evil.example' }), /https/);
  assert.throws(() => createClient({ maxPriceUsd: 0 }), /positive/);
});

test('free tools and paid runs are built; session-payment tools are left out; the MCP pay sentence is replaced', async () => withFetch(fakeServer(), async () => {
  const specs = await toolSpecs({});
  assert.deepEqual(specs.map((s) => s.name), ['search_cultmath', 'run_answer_share_quick', 'run_answer_share']);
  const run = specs.find((s) => s.name === 'run_answer_share_quick');
  assert.doesNotMatch(run.description, /returns a payment_url/);
  assert.match(run.description, /No payment is configured/);
  assert.ok(run.schema.properties.publish && run.schema.properties.question, 'publish fields offered');
  assert.equal(run.schema.additionalProperties, undefined);
  assert.equal(await specs[0].execute({ query: 'tariffs' }), 'results for tariffs');
}));

test('no wallet: a paid tool returns the price and terms and pays nothing', async () => {
  const calls = [];
  await withFetch(fakeServer({ calls }), async () => {
    const r = await createClient().run('answer-share-quick', { q1: 'a b c d e f g h i j', q2: 'k l m n o p q r s t' });
    assert.equal(r.payment_required, true);
    assert.equal(r.price_usd, 0.74);
    assert.equal(r.terms, TERMS);
    assert.equal(calls.filter((c) => c.path.startsWith('/run/')).length, 1, 'only the free price check');
  });
});

test('spend cap: a run above maxPriceUsd is refused before the payment fetch is called', async () => {
  let paid = 0;
  await withFetch(fakeServer(), async () => {
    const c = createClient({ fetch: async () => { paid += 1; return new Response('{}'); } });
    const r = await c.run('answer-share', { q1: 'x' });
    assert.equal(r.ok, false);
    assert.match(r.error, /above maxPriceUsd \$1\.00/);
    assert.equal(paid, 0);
  });
});

test('with a wallet and a price under the cap, the payment fetch carries the inputs and the result comes back', async () => {
  const seen = [];
  await withFetch(fakeServer(), async () => {
    const c = createClient({ fetch: async (url, init) => { seen.push({ url, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ run_id: 'asq_20261111_0123456789', sound: true })); } });
    const r = await c.run('answer-share-quick', { q1: 'one', q2: 'two', publish: true, question: 'who leads?' });
    assert.equal(r.ok, true);
    assert.equal(r.result.run_id, 'asq_20261111_0123456789');
    assert.equal(seen[0].url, 'https://cultmath.com/run/answer-share-quick');
    assert.deepEqual(seen[0].body, { q1: 'one', q2: 'two', publish: true, question: 'who leads?' });
  });
});

test('a refused run (failed controls) is reported as not charged', async () => withFetch(fakeServer(), async () => {
  const c = createClient({ fetch: async () => new Response(JSON.stringify({ error: 'measurement control failed', controls: { measurement: {} } }), { status: 422 }) });
  const r = await c.run('answer-share-quick', {});
  assert.deepEqual([r.ok, r.charged, r.status], [false, false, 422]);
  assert.ok(r.controls);
}));

test('LangChain adapter: tool(fn, {name, description, schema}) per spec, results as strings', async () => withFetch(fakeServer(), async () => {
  const made = [];
  const tool = (fn, cfg) => { made.push(cfg); return { ...cfg, invoke: fn }; };
  const tools = await langchainTools({ tool });
  assert.deepEqual(made.map((m) => m.name), ['search_cultmath', 'run_answer_share_quick', 'run_answer_share']);
  assert.equal(await tools[0].invoke({ query: 'x' }), 'results for x');
  assert.equal(typeof (await tools[1].invoke({ q1: 'a', q2: 'b' })), 'string');
}));

test('AI SDK adapter: a record of tool({description, inputSchema, execute}) keyed by name', async () => withFetch(fakeServer(), async () => {
  const ai = { jsonSchema: (s) => ({ jsonSchema: s }), tool: (t) => t };
  const tools = await aiSdkTools({ ai });
  assert.deepEqual(Object.keys(tools), ['search_cultmath', 'run_answer_share_quick', 'run_answer_share']);
  assert.ok(tools.run_answer_share_quick.inputSchema.jsonSchema.properties.q1);
  assert.equal(await tools.search_cultmath.execute({ query: 'y' }), 'results for y');
}));

test('the free tool list is the one the MCP server marks read-only research', () => {
  assert.deepEqual([...FREE_TOOLS].sort(), ['get_decision_brief', 'get_document', 'list_decision_briefs', 'list_decisions', 'search_cultmath']);
  assert.match(describeForAgent('x', { canPay: true, maxPriceUsd: 1 }), /only if the price is at most \$1\.00/);
});
