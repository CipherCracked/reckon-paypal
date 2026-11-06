# Accessible Commerce Companion — ITDs

| ITD 5 — *"Use Next.js with TypeScript on a single hosting provider."* |  |
| :---- | :---- |
| **THE PROBLEM** | One person, seven days, one demo, with server-side payment creation and model calls that must keep credentials off the client. |
| **OPTIONS CONSIDERED (Decision in bold)** | 1. **Next.js with TypeScript, deployed to Vercel or Render.**<br>2. A separate React app and an Express API.<br>3. Python with FastAPI and server-rendered templates.<br>4. A static site with serverless functions. |
| **REASONING** | The flow is one page with a server component: the checkout creates an order, the server computes, the model is called, the PayPal SDK renders. Next.js keeps the page and its server in one project with one deploy. Splitting client and API doubles the configuration without adding capability. Python is viable, but keeping the UI and the PayPal SDK in one language removes a context switch. A static site cannot hold secret keys. |
| **TRADEOFFS** | Framework conventions carry a learning cost if unfamiliar, and serverless cold starts add latency to the model call at the moment the shopper is waiting. |
| **NOTES** | No database is required; state is per order. If cold starts show up in the demo, the deployment moves to a long-running instance. |

---

**Revision — 2026-11-07: two statements in the row above are wrong about what was built.**

1. **"The model is called, the PayPal SDK renders."** There is no PayPal JavaScript SDK in this
   app. The payment is created server-side over REST and the shopper is handed to PayPal's own
   hosted approval page, returning to a capture endpoint. The reason is in ITD 1: the amount must
   never be assembled on the client, and the approval must be recorded by PayPal itself. The
   consequence for this ITD is only that "one language, one deploy" is even more true than claimed —
   no client-side payment library is part of the build.
2. **"No database is required; state is per order."** There is no per-order state either. The order
   id travels in the URL (`/consent/pending?slug=…&approved=1&token=…`), and the server recomputes
   every figure from the catalog on each request. This is sufficient for a demonstration and it is
   also the limit recorded in IPD 2's revision: nothing survives the page.

Everything else stands: Next.js 15 with the App Router, TypeScript in strict mode, deployed as a
single unit. The build target was never seven days — the plan was six weeks, of which the
implementation occupied two.
