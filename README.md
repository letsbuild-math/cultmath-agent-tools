# @cultmath/agent-tools

**Sourced, dated decision research for AI agents**, as LangChain and Vercel AI SDK tools.

- **Free research tools:** search CULT+MATH's published decision research and read any document (`search_cultmath`, `get_document`, decision briefs).
- **Pay-per-run measurements, from 5¢,** over x402 (USDC on Base):
  - share of US 10-K filers mentioning a risk, from SEC EDGAR;
  - federal regulation and spending trends;
  - search demand, share of search and fad checks;
  - whether AI assistants cite your domain, and who owns the AI answer in your category.

Every run checks its own controls first. **A run that fails them is refused and never charged.** Every result carries a run id, a date and a citation line.

## Use it in your AI tool

One server, every client: **`https://cultmath.com/mcp`** (streamable HTTP, no key, no account). It leads with **DEOS Open**, a free, programmatic decision enablement operating system for executives and their agents: `list_standards` and `get_standard` return any standard in full for an agent to follow. Search, documents, frameworks and DEOS Open standards are free. Each `run_*` tool returns its price first and charges nothing until the buyer pays.

| Client | How |
|---|---|
| **Claude Code** | `/plugin marketplace add letsbuild-math/cultmath-agent-tools` then `/plugin install cultmath@cultmath` (adds the connector and a skill for using it) — or `claude mcp add --transport http cultmath https://cultmath.com/mcp` |
| **Claude** (web, desktop, mobile) | Settings → Connectors → **Add custom connector** → `https://cultmath.com/mcp` |
| **ChatGPT** | Apps → search **CULT+MATH Research** |
| **Gemini CLI** | `gemini extensions install https://github.com/letsbuild-math/cultmath-agent-tools` |
| **Gemini app** | Settings → Connected Apps → **Add a custom app** → `https://cultmath.com/mcp` (Google limits custom apps to eligible personal accounts) |
| **Gemini Enterprise** | An admin adds `https://cultmath.com/mcp` as a custom MCP server |
| **Meta Muse** | Ask Muse: *"Connect a custom MCP server at https://cultmath.com/mcp"* |
| **Microsoft Copilot Studio** | Agent → Tools → Add a tool → **Model Context Protocol** → server URL `https://cultmath.com/mcp`, authentication None |
| **GitHub Copilot in VS Code** | [Install in VS Code](https://vscode.dev/redirect/mcp/install?name=cultmath&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fcultmath.com%2Fmcp%22%7D) — or add `{"servers": {"cultmath": {"type": "http", "url": "https://cultmath.com/mcp"}}}` to `.vscode/mcp.json` |
| **Cursor** | [Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=cultmath&config=eyJ1cmwiOiJodHRwczovL2N1bHRtYXRoLmNvbS9tY3AifQ==) — or add `{"mcpServers": {"cultmath": {"url": "https://cultmath.com/mcp"}}}` to `~/.cursor/mcp.json` |
| **Any other MCP client** | Point it at `https://cultmath.com/mcp` |
| **LangChain / Vercel AI SDK** | `npm install @cultmath/agent-tools` (below) |

Listed in the [official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=cultmath) as `com.cultmath/decision-briefs`. Agent guide: [cultmath.com/agent](https://cultmath.com/agent).

## Install

```bash
npm install @cultmath/agent-tools
# plus your framework: @langchain/core  or  ai
```

Tested with `@langchain/core` 1.4 and `ai` 7.0.

## LangChain

```js
import { createCultMathTools } from '@cultmath/agent-tools/langchain';

const tools = await createCultMathTools();               // free tools work; paid tools quote a price
const agent = createReactAgent({ llm, tools });
```

## Vercel AI SDK

```js
import { generateText } from 'ai';
import { createCultMathTools } from '@cultmath/agent-tools/ai-sdk';

const tools = await createCultMathTools();
const { text } = await generateText({ model, tools, prompt: 'Is tariff risk spreading through 10-K filings?' });
```

## Paying for runs

Pass your own x402 payment fetch. **This package never sees your wallet key.**

```js
import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: 'eip155:8453', client: new ExactEvmScheme(privateKeyToAccount(process.env.AGENT_WALLET_KEY)) }],
});

const tools = await createCultMathTools({ fetch: fetchWithPayment, maxPriceUsd: 1 });
```

**Spend cap.** Before any paid call, the package asks the server for the price with a free request. It refuses the call if the price is above `maxPriceUsd`, which defaults to $1.00. Most runs cost $0.05–$0.07. The two quick AI runs cost $0.74. The full AI runs cost $1.47 and $2.20, so you must raise `maxPriceUsd` to use them.

**Without a payment fetch,** a paid tool returns its price and delivery terms and charges nothing. Your agent can tell the user what a run would cost before anyone pays.

**Delivery terms.** The price is fixed per run, not per answer. Each AI run's description states how few answers a charged run can rest on, and the result reports the exact count.

## Publishing

Any paid tool accepts `publish: true` and `question` ("what you were asked"). A sound result is then submitted for publication on cultmath.com under CC BY 4.0. CULT+MATH reviews every submission before anything is public.

## Options

| Option | Default | |
|---|---|---|
| `fetch` | none | Your payment-enabled fetch. Without it, paid tools only quote. |
| `maxPriceUsd` | `1` | Refuse any run priced above this. |
| `include` / `exclude` | all | Tool names to keep or drop. |
| `timeoutMs` | `120000` | Per request. |

Also exported: `createClient()`, a framework-free client with `listTools()`, `callFree(name, args)`, `run(recipe, input)` and `priceOf(recipe)`.

## Links

- Prices and samples: https://cultmath.com/agent
- MCP server: `https://cultmath.com/mcp`
- OpenAPI: https://cultmath.com/openapi.json

MIT · © 2026 CULT+MATH LLC
