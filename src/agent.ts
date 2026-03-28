import { agentFetch, zbdPayL402Invoice } from "@axobot/fetch";
import { Agent, callable } from "agents";

import { DurableObjectTokenCache } from "./do-token-cache";

export type Env = {
  ZBD_API_KEY: string;
  ZBD_LIGHTNING_ADDRESS: string;
  ZBD_AGENT: DurableObjectNamespace;
};

export type AgentState = {
  lastFetchUrl: string | null;
  lastFetchAt: number | null;
  totalSpentSats: number;
};

type ScheduledFetchPayload = {
  url: string;
};

type FetchPaidResult = {
  status: number;
  body: string;
  spentSats: number;
};

export class ZBDPaymentAgent extends Agent<Env, AgentState> {
  public initialState: AgentState = {
    lastFetchUrl: null,
    lastFetchAt: null,
    totalSpentSats: 0,
  };

  private async agentFetchBuySide(
    url: string,
    maxSats: number,
    init?: RequestInit,
  ): Promise<{ response: Response; spentSats: number }> {
    let spentSats = 0;

    const response = await agentFetch(url, {
      tokenCache: new DurableObjectTokenCache(this.ctx.storage),
      maxPaymentSats: maxSats,
      pay: async (challenge, context) => {
        const paid = await zbdPayL402Invoice(
          challenge,
          context ?? { url: "" },
          { apiKey: this.env.ZBD_API_KEY },
        );
        spentSats = paid.amountPaidSats ?? challenge.amountSats;
        return paid;
      },
      waitForPayment: async (paymentId) => {
        const maxAttempts = 10;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const response = await fetch(
            `https://api.zbdpay.com/v0/payments/${paymentId}`,
            {
              headers: {
                apikey: this.env.ZBD_API_KEY,
              },
            },
          );

          const body = (await response.json()) as {
            data?: {
              status?: string;
              preimage?: string;
              amount_sats?: number;
            };
            status?: string;
            preimage?: string;
            amount_sats?: number;
          };

          const status = body.data?.status ?? body.status;
          if (status === "completed" || status === "paid" || status === "settled") {
            const amountPaidSats = body.data?.amount_sats ?? body.amount_sats;
            if (typeof amountPaidSats === "number") {
              spentSats = amountPaidSats;
            }
            return {
              status: "completed" as const,
              paymentId,
              preimage: body.data?.preimage ?? body.preimage,
              amountPaidSats,
            };
          }

          if (status === "failed" || status === "error" || status === "cancelled") {
            return {
              status: "failed" as const,
              paymentId,
              failureReason: `payment_${status}`,
            };
          }
        }

        return {
          status: "pending" as const,
          paymentId,
        };
      },
      ...(init ? { requestInit: init } : {}),
    });

    return { response, spentSats };
  }

  @callable()
  public async fetchPaid(url: string, maxSats = 1000): Promise<FetchPaidResult> {
    const { response, spentSats } = await this.agentFetchBuySide(url, maxSats);
    const body = await response.text();

    this.setState({
      ...this.state,
      lastFetchUrl: url,
      lastFetchAt: Math.floor(Date.now() / 1000),
      totalSpentSats: this.state.totalSpentSats + spentSats,
    });

    return {
      status: response.status,
      body,
      spentSats,
    };
  }

  @callable()
  public async startScheduledFetch(url: string): Promise<void> {
    this.setState({
      ...this.state,
      lastFetchUrl: url,
      lastFetchAt: Math.floor(Date.now() / 1000),
    });
    await this.schedule(60, "scheduledFetch", { url });
  }

  public async scheduledFetch({ url }: ScheduledFetchPayload): Promise<void> {
    await this.fetchPaid(url);
    await this.schedule(60, "scheduledFetch", { url });
  }

  public async onStart(): Promise<void> {
    console.log(
      `ZBDPaymentAgent started for lightning address: ${this.env.ZBD_LIGHTNING_ADDRESS}`,
    );
    if (this.state.lastFetchUrl) {
      await this.schedule(60, "scheduledFetch", { url: this.state.lastFetchUrl });
    }
  }
}
