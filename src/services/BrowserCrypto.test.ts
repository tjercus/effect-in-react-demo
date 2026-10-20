// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Crypto, Effect } from "effect";
import { BrowserCryptoLive } from "./BrowserCrypto";

const webcrypto = globalThis.crypto;

const digest = (data: Uint8Array) =>
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto;
    return yield* crypto.digest("SHA-256", data);
  }).pipe(Effect.provide(BrowserCryptoLive));

beforeEach(() => vi.stubGlobal("crypto", webcrypto));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BrowserCrypto", () => {
  it("hashes only the bytes in the supplied view", async () => {
    const bytes = new Uint8Array([0, 97, 98, 99, 0]).subarray(1, 4);
    const hash = await Effect.runPromise(digest(bytes));

    expect(Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("preserves rejected digest requests as typed platform failures", async () => {
    const cause = new Error("Digest unavailable");
    vi.spyOn(webcrypto.subtle, "digest").mockRejectedValue(cause);
    const error = await Effect.runPromise(digest(new Uint8Array()).pipe(Effect.flip));

    expect(error).toMatchObject({
      _tag: "PlatformError",
      reason: { module: "Crypto", method: "digest", cause },
    });
  });

  it("reports missing Web Crypto as a typed platform failure", async () => {
    vi.stubGlobal("crypto", undefined);
    const error = await Effect.runPromise(digest(new Uint8Array()).pipe(Effect.flip));

    expect(error).toMatchObject({
      _tag: "PlatformError",
      reason: { module: "Crypto", method: "digest" },
    });
    expect(error.cause).toBeInstanceOf(TypeError);
  });
});
