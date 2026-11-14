# @cultmath/agent-tools

**Sourced, dated decision research for AI agents**, as LangChain and Vercel AI SDK tools.

- **Free research tools:** search CULT+MATH's published decision research and read any document (`search_cultmath`, `get_document`, decision briefs).
- **Pay-per-run measurements, from 5¢,** over x402 (USDC on Base):
  - share of US 10-K filers mentioning a risk, from SEC EDGAR;
  - federal regulation and spending trends;
  - search demand, share of search and fad checks;
  - whether AI assistants cite your domain, and who owns the AI answer in your category.

Every run checks its own controls first. **A run that fails them is refused and never charged.** Every result carries a run id, a date and a citation line.

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
