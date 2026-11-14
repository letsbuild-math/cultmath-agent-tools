// @cultmath/agent-tools — the client both framework adapters share. No dependencies.
// CULT+MATH · November 11, 2026 · © 2026 Ipalibo Da-Wariboko · MIT
//
// Two kinds of tool, from the live CULT+MATH MCP server (https://cultmath.com/mcp):
//   · Free research tools (search_cultmath, get_document, ...): called over MCP JSON-RPC.
//   · Paid runs (run_*): POST https://cultmath.com/run/<recipe>, paid over x402 (USDC on Base).
//
// Security model (least privilege):
//   · This package never sees a wallet key. To pay, pass `fetch`: your own payment-enabled fetch
//     (for example an x402 fetch wrapper holding your signer). Without it, a paid tool returns the
//     price and the delivery terms and pays nothing.
//   · Before any paid call it asks for the price with a free, input-less request and refuses if the
//     price is above `maxPriceUsd` (default $1.00), whatever your payment fetch would allow.
//   · Every request has a timeout. Responses are size-capped before parsing.

export const DEFAULT_BASE_URL = 'https://cultmath.com';
export const DEFAULT_MAX_PRICE_USD = 1;
export const FREE_TOOLS = Object.freeze(['search_cultmath', 'get_document', 'list_decision_briefs', 'get_decision_brief', 'list_decisions']);
const MAX_BODY = 2_000_000;
const USDC_DECIMALS = 6;

export const recipeOf = (toolName) => (/^run_[a-z_]+$/.test(toolName) ? toolName.slice(4).replace(/_/g, '-') : null);

// The MCP description tells an MCP client the tool only returns payment instructions. Here the tool
// pays, so that sentence is replaced with what actually happens.
const MCP_PAY_SENTENCE = /This tool charges nothing: it validates the request and returns a payment_url, the price and instructions\. Pay by POSTing to payment_url over MPP \(HTTP 402, a Stripe shared payment token from your wallet\)\.\s*/;
export function describeForAgent(description, { canPay, maxPriceUsd }) {
  const note = canPay
    ? `Calling this tool pays for the run over x402 (USDC on Base) with the configured wallet, only if the price is at most $${maxPriceUsd.toFixed(2)}.`
    : 'No payment is configured: calling this tool returns the price and the delivery terms and charges nothing.';
  const base = String(description || '');
  return MCP_PAY_SENTENCE.test(base) ? base.replace(MCP_PAY_SENTENCE, `${note} `) : `${base} ${note}`;
}

async function readCapped(res) {
  const text = await res.text();
  if (text.length > MAX_BODY) throw new Error(`CULT+MATH response too large (${text.length} bytes)`);
  return text;
}
const parseJson = (text) => { try { return JSON.parse(text); } catch { return null; } };

// The x402 PAYMENT-REQUIRED header is base64 JSON with accepts[].amount in atomic units.
export function priceFromHeader(header) {
  if (!header) return null;
  let raw; try { raw = typeof atob === 'function' ? atob(String(header)) : Buffer.from(String(header), 'base64').toString('binary'); } catch { return null; }
  const doc = parseJson(raw);
  const offer = doc?.accepts?.find((a) => a?.scheme === 'exact') || doc?.accepts?.[0];
  const amount = Number(offer?.amount ?? offer?.maxAmountRequired);
  return Number.isFinite(amount) ? amount / 10 ** USDC_DECIMALS : null;
}

export function createClient({ fetch: payFetch, baseUrl = DEFAULT_BASE_URL, maxPriceUsd = DEFAULT_MAX_PRICE_USD, timeoutMs = 120_000, headers = {} } = {}) {
  const plain = globalThis.fetch;
  if (typeof plain !== 'function') throw new Error('@cultmath/agent-tools needs a global fetch (Node 18+).');
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') throw new Error('baseUrl must be https');
  if (!(maxPriceUsd > 0)) throw new Error('maxPriceUsd must be a positive number of dollars');
  const base = url.origin;
  const common = { 'user-agent': '@cultmath/agent-tools', ...headers };
  let id = 0;
  let toolsCache = null;

  async function mcp(method, params) {
    const res = await plain(`${base}/mcp`, {
      method: 'POST',
      headers: { ...common, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await readCapped(res);
    const doc = parseJson(text.slice(Math.max(0, text.indexOf('{'))));
    if (!doc) throw new Error(`CULT+MATH MCP answered HTTP ${res.status} with no JSON`);
    if (doc.error) throw new Error(`CULT+MATH MCP error: ${doc.error.message || doc.error.code}`);
    return doc.result;
  }

  async function listTools() {
    if (!toolsCache) toolsCache = (await mcp('tools/list', {}))?.tools || [];
    return toolsCache;
  }

  async function callFree(name, args = {}) {
    if (!FREE_TOOLS.includes(name)) throw new Error(`${name} is not a free CULT+MATH tool`);
    const r = await mcp('tools/call', { name, arguments: args });
    if (r?.structuredContent) return r.structuredContent;
    return (r?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  }

  // The price, from a free request with no inputs (the server answers 402 with its x402 offer).
  async function priceOf(recipe) {
    const res = await plain(`${base}/run/${encodeURIComponent(recipe)}`, {
      method: 'POST', headers: { ...common, 'content-type': 'application/json', accept: 'application/json' }, body: '{}', signal: AbortSignal.timeout(30_000),
    });
    const body = parseJson(await readCapped(res)) || {};
    return { status: res.status, usd: priceFromHeader(res.headers.get('payment-required')), terms: body.terms || null, usage: body.usage || null, error: res.status === 402 ? null : body.error || null };
  }

  async function run(recipe, input = {}) {
    if (!/^[a-z][a-z-]{1,40}$/.test(recipe)) throw new Error('invalid recipe');
    const quote = await priceOf(recipe);
    if (quote.status !== 402) return { ok: false, recipe, error: quote.error || `the run answered HTTP ${quote.status} before payment; it may be switched off`, charged: false };
    if (quote.usd == null) return { ok: false, recipe, error: 'no x402 price was offered', charged: false };
    if (quote.usd > maxPriceUsd) return { ok: false, recipe, charged: false, price_usd: quote.usd, error: `price $${quote.usd.toFixed(2)} is above maxPriceUsd $${maxPriceUsd.toFixed(2)}; raise maxPriceUsd to allow it`, terms: quote.terms };
    if (typeof payFetch !== 'function') return { ok: false, recipe, charged: false, payment_required: true, price_usd: quote.usd, terms: quote.terms, how_to_pay: 'Pass a payment-enabled fetch (x402, USDC on Base) as `fetch` when creating the tools.' };
    const res = await payFetch(`${base}/run/${encodeURIComponent(recipe)}`, {
      method: 'POST', headers: { ...common, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(timeoutMs),
    });
    const body = parseJson(await readCapped(res)) || {};
    if (res.ok) return { ok: true, recipe, price_usd: quote.usd, result: body };
    return { ok: false, recipe, charged: false, status: res.status, error: body.error || body.reason || body.detail || `HTTP ${res.status}`, ...(body.controls ? { controls: body.controls } : {}) };
  }

  return { listTools, callFree, run, priceOf, canPay: typeof payFetch === 'function', maxPriceUsd, baseUrl: base };
}

// The tool definitions both adapters build from: name, description, JSON schema, execute.
export async function toolSpecs(options = {}) {
  const client = options.client || createClient(options);
  const { include, exclude = [] } = options;
  const all = await client.listTools();
  const want = (n) => (!include || include.includes(n)) && !exclude.includes(n);
  const specs = [];
  for (const t of all) {
    if (!want(t.name)) continue;
    const recipe = recipeOf(t.name);
    if (FREE_TOOLS.includes(t.name)) {
      specs.push({ name: t.name, description: t.description, schema: t.inputSchema || { type: 'object', properties: {} }, execute: (args) => client.callFree(t.name, args || {}) });
    } else if (recipe) {
      const schema = structuredClone(t.inputSchema || { type: 'object', properties: {} });
      schema.properties = { ...(schema.properties || {}),
        publish: { type: 'boolean', description: 'Optional: submit a sound result for publication on cultmath.com (CULT+MATH reviews every submission first; CC BY 4.0).' },
        question: { type: 'string', maxLength: 300, description: 'Required with publish: what you were asked, in plain words. No personal data.' } };
      delete schema.additionalProperties;
      specs.push({ name: t.name, description: describeForAgent(t.description, client), schema, execute: (args) => client.run(recipe, args || {}) });
    }
  }
  return specs;
}
