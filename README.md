# ZBD × Cloudflare Agent Template

A Cloudflare Workers starter for building AI agents that can pay and get paid over Lightning, powered by Durable Objects.

---

## What's Included

- **Buy-side payments:** `agentFetch` with `zbdPayL402Invoice` for fetching L402-protected APIs and paying automatically
- **Sell-side payments:** `createHonoPaymentMiddleware` for putting your own Hono routes behind a Lightning paywall
- **Scheduled tasks:** `this.schedule(60, ...)` for recurring background fetches that survive worker restarts
- **WebSocket sync:** Real-time agent state updates via the `agents` SDK Durable Object connection
- **Token persistence:** `DurableObjectTokenCache` (buy-side) and `DurableObjectTokenStore` (sell-side) backed by Durable Object SQLite storage

---

## Prerequisites

- Node.js >= 22
- A [Cloudflare](https://cloudflare.com) account
- A ZBD API key — get one at [developer.zbdpay.com](https://developer.zbdpay.com)

---

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/zbdpay/cloudflare-template.git
   cd cloudflare-template
   npm install
   ```

2. **Initialize your ZBD wallet**

   ```bash
   npx @axobot/cli init --key YOUR_ZBD_API_KEY
   ```

   This creates a Lightning address for your agent and prints it out. Save it for the next step.

3. **Configure local secrets**

   Cloudflare Workers uses `.dev.vars` for local secrets (not `.env`):

   ```bash
   cp .env.example .dev.vars
   ```

   Then open `.dev.vars` and fill in:

   | Variable | Description |
   |---|---|
   | `ZBD_API_KEY` | Your ZBD API key |
   | `ZBD_LIGHTNING_ADDRESS` | The Lightning address from step 2 |

4. **Run the dev server**

   ```bash
   npm run dev
   ```

5. **Deploy**

   ```bash
   npm run deploy
   ```

---

## Test It

With the dev server running on `http://localhost:5173`:

```bash
# Check worker status and your Lightning address
curl http://localhost:5173/

# Buy-side: call a @callable agent method to fetch a paid L402 API
curl -X POST http://localhost:5173/agents/ZBDPaymentAgent/my-agent/fetchPaid \
  -H "Content-Type: application/json" \
  -d '{"args": ["https://some-l402-api.example.com/data", 1000]}'

# Sell-side: hit the premium endpoint (returns 402 Payment Required)
curl -v http://localhost:5173/api/premium

# Start a recurring scheduled fetch (runs every 60 seconds)
curl -X POST http://localhost:5173/agents/ZBDPaymentAgent/my-agent/startScheduledFetch \
  -H "Content-Type: application/json" \
  -d '{"args": ["https://some-l402-api.example.com/data"]}'
```

---

## File Structure

```
cloudflare-template/
├── src/
│   ├── agent.ts              # ZBDPaymentAgent: buy-side, scheduled tasks, state
│   ├── do-token-cache.ts     # DurableObjectTokenCache: buy-side L402 token persistence
│   └── do-token-store.ts     # DurableObjectTokenStore: sell-side payment verification
├── worker/
│   └── index.ts              # Hono app: sell-side middleware, agent routing
├── .env.example              # Template for .dev.vars secrets
├── vite.config.ts
├── wrangler.jsonc            # Durable Object bindings and migrations
├── package.json
└── tsconfig.json
```

---

## References

- [ZBD Agent Docs](https://docs.zbdpay.com/agents)
- [@axobot/fetch on npm](https://www.npmjs.com/package/@axobot/fetch)
- [@axobot/pay on npm](https://www.npmjs.com/package/@axobot/pay)
- [@axobot/pay on npm](https://www.npmjs.com/package/@axobot/pay)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [agents SDK](https://www.npmjs.com/package/agents)
