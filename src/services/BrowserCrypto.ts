import { Crypto, Effect, Layer } from "effect";

/**
 * Browser implementation of Effect's `Crypto` service, backed by Web Crypto.
 * Lets service code generate UUIDs through Effect instead of calling
 * `crypto.randomUUID()` directly, so tests can swap in a deterministic layer.
 */
export const BrowserCryptoLive = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    randomBytes: (size) => globalThis.crypto.getRandomValues(new Uint8Array(size)),
    digest: (algorithm, data) =>
      Effect.promise(async () => {
        const buffer = await globalThis.crypto.subtle.digest(algorithm, data as BufferSource);
        return new Uint8Array(buffer);
      }),
  }),
);
