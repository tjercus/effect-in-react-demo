import { Context, Crypto, Data, Effect, Layer } from "effect";
import { BrowserCryptoLive } from "./BrowserCrypto";

export interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

export class TodoApiError extends Data.TaggedError("TodoApiError")<{
  readonly message: string;
}> {}

export class TodoApi extends Context.Service<
  TodoApi,
  {
    readonly getTodos: Effect.Effect<ReadonlyArray<Todo>, TodoApiError>;
    readonly createTodo: (title: string) => Effect.Effect<Todo, TodoApiError>;
  }
>()("app/TodoApi") {}

const seed: ReadonlyArray<Todo> = [
  { id: "1", title: "Build Effect SPA", completed: false },
  { id: "2", title: "Integrate React 19", completed: true },
];

/**
 * Client-side "API" adapter. Simulates network latency so the UI has a real
 * pending state to render. Swap this layer for an HTTP / IndexedDB adapter
 * without touching atoms or components.
 */
export const makeTodoApiLayer = (options: { readonly latencyMs: number }) =>
  Layer.effect(
    TodoApi,
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto;
      const delay = Effect.sleep(`${options.latencyMs} millis`);

      return TodoApi.of({
        getTodos: delay.pipe(Effect.as(seed)),
        createTodo: Effect.fn("TodoApi.createTodo")(function* (title) {
          const trimmed = title.trim();
          if (trimmed.length === 0) {
            return yield* new TodoApiError({ message: "Title must not be empty" });
          }
          yield* delay;
          const id = yield* Effect.orDie(crypto.randomUUIDv7());
          return { id, title: trimmed, completed: false };
        }),
      });
    }),
  ).pipe(Layer.provide(BrowserCryptoLive));

export const TodoApiLive = makeTodoApiLayer({ latencyMs: 300 });
