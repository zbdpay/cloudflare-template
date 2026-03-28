import type { DurableObjectStorage } from "@cloudflare/workers-types";
import type { TokenCache, TokenRecord } from "@axobot/fetch";

const tokenKey = (url: string): string => `token:${url}`;

const isExpired = (expiresAt?: number): boolean => {
  if (expiresAt === undefined) {
    return false;
  }
  return expiresAt <= Math.floor(Date.now() / 1000);
};

export class DurableObjectTokenCache implements TokenCache {
  public constructor(private readonly storage: DurableObjectStorage) {}

  public async get(url: string): Promise<TokenRecord | null> {
    const key = tokenKey(url);
    const token = await this.storage.get<TokenRecord>(key);

    if (!token) {
      return null;
    }

    if (isExpired(token.expiresAt)) {
      await this.storage.delete(key);
      return null;
    }

    return token;
  }

  public async set(url: string, token: TokenRecord): Promise<void> {
    await this.storage.put(tokenKey(url), token);
  }

  public async delete(url: string): Promise<void> {
    await this.storage.delete(tokenKey(url));
  }
}
