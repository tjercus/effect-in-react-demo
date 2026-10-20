import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { Effect } from "effect";
import { makeTodoApiLayer, TodoApi } from "./TodoApi";

const createTodo = (title: string) =>
  Effect.gen(function* () {
    const api = yield* TodoApi;
    return yield* api.createTodo(title);
  }).pipe(Effect.provide(makeTodoApiLayer({ latencyMs: 0 })));

afterEach(() => vi.unstubAllGlobals());

describe("TodoApi", () => {
  it("trims titles and generates distinct UUIDv7 IDs", async () => {
    const first = await Effect.runPromise(createTodo("  Write tests  "));
    const second = await Effect.runPromise(createTodo("Write tests"));

    expect(first).toMatchObject({ title: "Write tests", completed: false });
    expect(first.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(second.id).not.toBe(first.id);
  });

  it.each(["", " ", "\n\t"])("rejects a blank title (%j) with a typed failure", async (title) => {
    const error = await Effect.runPromise(createTodo(title).pipe(Effect.flip));

    expect(error).toMatchObject({ _tag: "TodoApiError", message: "Title must not be empty" });
  });

  it("reports unavailable Web Crypto as a typed failure instead of a defect", async () => {
    vi.stubGlobal("crypto", undefined);
    const error = await Effect.runPromise(createTodo("Write tests").pipe(Effect.flip));

    expect(error).toMatchObject({ _tag: "TodoApiError", message: "Could not generate a todo ID" });
    expect(error.cause).toBeInstanceOf(TypeError);
  });
});
