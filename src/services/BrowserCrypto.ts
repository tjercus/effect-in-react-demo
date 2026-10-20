import { Crypto, Effect, Layer, PlatformError } from "effect";

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
      Effect.tryPromise({
        try: () => globalThis.crypto.subtle.digest(algorithm, new Uint8Array(data)),
        catch: (cause) =>
          PlatformError.systemError({
            module: "Crypto",
            method: "digest",
            _tag: "Unknown",
            description: "Could not compute digest",
            cause,
          }),
      }).pipe(Effect.map((buffer) => new Uint8Array(buffer))),
  }),
);
