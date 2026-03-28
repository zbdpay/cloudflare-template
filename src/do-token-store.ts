import type { DurableObjectStorage } from "@cloudflare/workers-types";
import type { TokenStore } from "@axobot/pay";

interface SettledTokenRecord {
  chargeId: string;
  paymentHash: string;
  amountSats: number;
  expiresAt: number;
  resource: string;
  verifiedAt: number;
}

const settledKey = (chargeId: string, paymentHash: string): string =>
  `settled:${chargeId}:${paymentHash}`;

export class DurableObjectTokenStore implements TokenStore {
  public constructor(private readonly storage: DurableObjectStorage) {}

  public async isSettled(chargeId: string, paymentHash: string): Promise<boolean> {
    const record = await this.storage.get<SettledTokenRecord>(
      settledKey(chargeId, paymentHash),
    );
    return record !== undefined;
  }

  public async markSettled(record: {
    chargeId: string;
    paymentHash: string;
    amountSats: number;
    expiresAt: number;
    resource: string;
  }): Promise<void> {
    const key = settledKey(record.chargeId, record.paymentHash);
    const storedRecord: SettledTokenRecord = {
      ...record,
      verifiedAt: Math.floor(Date.now() / 1000),
    };
    await this.storage.put(key, storedRecord);
  }
}
