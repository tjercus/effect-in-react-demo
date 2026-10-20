# effect-in-react-demo

A small TODO single-page app showing how to use **Effect v4** (`effect@4`, `@effect/atom-react`) inside a **React 19** SPA.
Built with [Vite+](https://viteplus.dev/), TypeScript 7, and styled with [XP.css](https://botoxparty.github.io/XP.css/).

## Run it

```bash
pnpm install
pnpm exec vp dev          # dev server
pnpm exec vp test run     # unit + component tests (Vitest, jsdom)
pnpm exec vp check        # format + lint + type check
pnpm exec vp build        # production build
```

## The mental model

| Concern | Effect v4 tool | File |
| --- | --- | --- |
| Dependencies / side-effect boundaries | `Context.Service` + `Layer` | `src/services/` |
| Local reactive state | `Atom.make(value)` | `src/state/todoAtoms.ts` |
| Derived state | `Atom.make((get) => ...)` | `src/state/todoAtoms.ts` |
| Async work with services | `Atom.runtime(layer)` → `runtime.atom(effect)` / `runtime.fn()(...)` | `src/state/todoAtoms.ts` |
| React bindings | `RegistryProvider`, `useAtom`, `useAtomValue`, `useAtomSet`, `useAtomMount` | `src/components/TodoApp.tsx`, `src/main.tsx` |

Data flow: **components → atoms → services (Layers)**. Components never call services directly.

## 1. Services (`src/services/TodoApi.ts`)

v4 replaced `Context.Tag` with `Context.Service`. A service is a class declaring its shape; a `Layer` provides it.

```ts
export class TodoApi extends Context.Service<
  TodoApi,
  {
    readonly getTodos: Effect.Effect<ReadonlyArray<Todo>, TodoApiError>
    readonly createTodo: (title: string) => Effect.Effect<Todo, TodoApiError>
  }
>()("app/TodoApi") {}

export const makeTodoApiLayer = (options: { latencyMs: number }) =>
  Layer.effect(
    TodoApi,
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto // Effect-backed UUIDs, swappable in tests
      return TodoApi.of({ /* ... */ })
    }),
  ).pipe(Layer.provide(BrowserCryptoLive))
```

- Errors are typed (`Data.TaggedError`) and flow into atoms as `AsyncResult.Failure`.
- IDs come from Effect's `Crypto.randomUUIDv7()` rather than `crypto.randomUUID()`. `src/services/BrowserCrypto.ts` implements the `Crypto` service on top of Web Crypto.
- Swap the layer (HTTP, IndexedDB, in-memory fake) without touching atoms or components.

## 2. Atoms (`src/state/todoAtoms.ts`)

```ts
const runtime = Atom.runtime(layer)                     // Layer -> atom that can run effects

const todosAtom = Atom.make<ReadonlyArray<Todo>>([])    // writable state
const filterAtom = Atom.make<Filter>("all")
const filteredTodosAtom = Atom.make((get) =>            // derived; tracks deps via `get`
  applyFilter(get(todosAtom), get(filterAtom)))

const loadTodosAtom = runtime.atom(                     // effect atom -> AsyncResult
  Effect.gen(function* () {
    const api = yield* TodoApi
    const todos = yield* api.getTodos
    yield* Atom.set(todosAtom, todos)
  }))

const addTodoAtom = runtime.fn<string>()(               // write an argument to run it
  Effect.fnUntraced(function* (title) {
    const api = yield* TodoApi
    const todo = yield* api.createTodo(title)
    yield* Atom.update(todosAtom, (prev) => [...prev, todo])
  }))
```

`makeTodoAtoms(layer)` is a factory so tests can build the same atom graph over a fake layer. `src/state/index.ts` wires the live one.

## 3. React (`src/components/TodoApp.tsx`, `src/main.tsx`)

- `RegistryProvider` (in `main.tsx`) holds the `AtomRegistry`, i.e. all atom state. It does **not** take a layer; layers are bound to atoms through `Atom.runtime`.
- `useAtomMount(loadTodosAtom)` runs the fetch while the component is mounted; unmounting interrupts it and closes its `Scope`.
- `useAtomValue(atom)` subscribes to a value; `useAtomSet(atom)` returns a setter (accepts an updater function); `useAtom(atom)` returns both.
- For effect atoms the value is an `AsyncResult` (`Initial | Success | Failure`, each with a `waiting` flag). Use `AsyncResult.isInitial/isFailure/isSuccess` or `AsyncResult.match`.
- `useAtom(addTodoAtom)` gives `[result, add]`; `result.waiting` is the pending flag, so no `useTransition` is needed for Effect-driven pending UI.

## Differences from older Effect / atom examples

Examples floating around (including LLM output) often use APIs that don't exist in `effect@4.0.5`:

| Old / hallucinated | Use instead |
| --- | --- |
| `Context.Tag("X")<X, Shape>()` | `Context.Service<X, Shape>()("X")` |
| `Atom.makeEffect(effect)` | `runtime.atom(effect)` (or `Atom.make(effect)` when no services needed) |
| `Atom.all([a, b])` + `Atom.map` | `Atom.make((get) => f(get(a), get(b)))` |
| `<AtomProvider layer={...}>` | `<RegistryProvider>` + `Atom.runtime(layer)` |
| `useRunEffect()` | `runtime.fn()(...)` atom + `useAtom` / `useAtomSet` |
| `crypto.randomUUID()` | `Crypto.randomUUIDv7()` via the `Crypto` service |

Atom APIs live under `effect/reactivity` and are marked `@stability unstable` in v4, so expect changes.

## Testing

- **Atoms**: create an `AtomRegistry.make()`, `registry.set/get/mount`, and a zero-latency layer. See `src/state/todoAtoms.test.ts`.
- **Components**: render inside `RegistryProvider` with Testing Library. See `src/components/TodoApp.test.tsx`.

## Build note

`build.cssMinify` is disabled in `vite.config.ts` because XP.css contains a selector (`progress:not([value]):before:not([value])`) that lightningcss refuses to minify.
