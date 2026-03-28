import { Hono } from "hono";
import { routeAgentRequest } from "agents";
import {
  createHonoPaymentMiddleware,
  type TokenStore,
} from "@axobot/pay";
import { ZBDPaymentAgent } from "../src/agent";

type Env = {
  ZBD_API_KEY: string;
  ZBD_LIGHTNING_ADDRESS: string;
  ZBD_AGENT: DurableObjectNamespace;
};

class InMemoryTokenStore implements TokenStore {
  private settled = new Map<string, boolean>();

  public async isSettled(chargeId: string, paymentHash: string): Promise<boolean> {
    return this.settled.get(`${chargeId}:${paymentHash}`) === true;
  }

  public async markSettled(record: {
    chargeId: string;
    paymentHash: string;
    amountSats: number;
    expiresAt: number;
    resource: string;
  }): Promise<void> {
    this.settled.set(`${record.chargeId}:${record.paymentHash}`, true);
  }
}

const app = new Hono<{ Bindings: Env }>();
const sellSideTokenStore = new InMemoryTokenStore();

app.use("/api/premium", async (c, next) => {
  const middleware = createHonoPaymentMiddleware({
    amount: 100,
    currency: "SAT",
    apiKey: c.env.ZBD_API_KEY,
    tokenStore: sellSideTokenStore,
  });

  return middleware(c, next);
});

app.get("/", (c) =>
  c.json({ status: "ok", address: c.env.ZBD_LIGHTNING_ADDRESS }),
);

app.get("/api/premium", (c) =>
  c.json({
    data: "Premium content unlocked. Thanks for the sats!",
    timestamp: new Date().toISOString(),
  }),
);

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return (await routeAgentRequest(req, env)) ?? app.fetch(req, env, ctx);
  },
};

export { ZBDPaymentAgent };
