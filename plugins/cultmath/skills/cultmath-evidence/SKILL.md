---
name: cultmath-evidence
description: Use when the user is weighing a business decision and a sourced fact about a market, company, rule, deal or AI-answer visibility would change the answer. Starts from a DEOS Open standard (free), searches CULT+MATH research (free), applies a framework, and runs a fresh measurement only with the user's approval of its quoted price.
---

# CULT+MATH evidence

CULT+MATH makes DEOS Open, a free, programmatic decision enablement operating system for executives and their agents. This extension connects you to its MCP server at `https://cultmath.com/mcp`.

## Use it when

The user is weighing a business decision and a fact about a market, a company, a rule, a deal or what AI assistants say would change the answer.

## How to use it

1. **Start with DEOS Open, free.** `list_standards` lists the DEOS Open standards and `get_standard` returns one in full with its template. Pick the one that fits the decision, read it in full and follow its steps rather than working from memory.
2. **Search when a step needs evidence, free.** `search_cultmath` finds published studies and answers. `get_document` reads one in full, with its sources and dates.
3. **Read a framework when the decision has a shape.** `list_frameworks` and `get_framework` (free) return named ways to read a decision, and the runs that put evidence behind each step.
4. **Run a fresh measurement only when the published research does not cover it.** Each `run_*` tool first returns a quote with a price and a payment URL; the quote itself charges nothing. **Never pay without the user's explicit approval of that price.**
5. **Cite.** Give the study or run URL with its date. Study data is CC BY 4.0: cite CULT+MATH and link the page.
6. **Say what the evidence cannot tell you.** Every finding states its limits; carry them into your answer.

Decision Briefs are paid PDFs. Do not present one as free; link its page.
