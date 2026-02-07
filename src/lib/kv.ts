import { kv } from "@vercel/kv";

// For local development without Vercel KV, fall back to in-memory storage
const memoryStore = new Map<string, string>();
const useMemory = !process.env.KV_REST_API_URL;

export async function kvGet(key: string): Promise<string | null> {
  if (useMemory) return memoryStore.get(key) || null;
  const value = await kv.get(key);
  // Upstash returns parsed objects, but we need strings for JSON.parse consistency
  return value === null ? null : typeof value === "string" ? value : JSON.stringify(value);
}

export async function kvSet(key: string, value: string): Promise<void> {
  if (useMemory) {
    memoryStore.set(key, value);
    return;
  }
  await kv.set(key, value);
}

// Credential storage keys
export const KV_KEYS = {
  CREDENTIAL: "webauthn:credential",
  CHALLENGE: "webauthn:challenge",
  REGISTERED: "webauthn:registered",
};
