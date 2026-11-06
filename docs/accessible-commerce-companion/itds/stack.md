# Accessible Commerce Companion — ITDs

| ITD 5 — *"Use Next.js with TypeScript on a single hosting provider."* |  |
| :---- | :---- |
| **THE PROBLEM** | One person, seven days, one demo, with server-side payment creation and model calls that must keep credentials off the client. |
| **OPTIONS CONSIDERED (Decision in bold)** | 1. **Next.js with TypeScript, deployed to Vercel or Render.**<br>2. A separate React app and an Express API.<br>3. Python with FastAPI and server-rendered templates.<br>4. A static site with serverless functions. |
| **REASONING** | The flow is one page with a server component: the checkout creates an order, the server computes, the model is called, the PayPal SDK renders. Next.js keeps the page and its server in one project with one deploy. Splitting client and API doubles the configuration without adding capability. Python is viable, but keeping the UI and the PayPal SDK in one language removes a context switch. A static site cannot hold secret keys. |
| **TRADEOFFS** | Framework conventions carry a learning cost if unfamiliar, and serverless cold starts add latency to the model call at the moment the shopper is waiting. |
| **NOTES** | No database is required; state is per order. If cold starts show up in the demo, the deployment moves to a long-running instance. |
