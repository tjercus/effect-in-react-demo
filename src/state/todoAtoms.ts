import { Effect, Match } from "effect";
import { Atom } from "effect/reactivity";
import type { Layer } from "effect";
import { TodoApi, type Todo } from "../services/TodoApi";

export type Filter = "all" | "active" | "completed";

export const applyFilter = (
  todos: ReadonlyArray<Todo>,
  filter: Filter,
): ReadonlyArray<Todo> =>
  Match.value(filter).pipe(
    Match.when("active", () => todos.filter((t) => !t.completed)),
    Match.when("completed", () => todos.filter((t) => t.completed)),
    Match.when("all", () => todos),
    Match.exhaustive,
  );

/**
 * Builds the atom graph on top of a service layer. A factory (instead of
 * module-level constants) lets tests wire the same atoms to a fake layer.
 */
export const makeTodoAtoms = (layer: Layer.Layer<TodoApi>) => {
  // Atom.runtime turns a Layer into an atom; atoms created from it can `yield*` its services.
  const runtime = Atom.runtime(layer);

  // 1. Core state atom (plain writable value)
  const todosAtom = Atom.make<ReadonlyArray<Todo>>([]);

  // 2. Filter state atom
  const filterAtom = Atom.make<Filter>("all");

  // 3. Derived atom: recomputes only when todosAtom or filterAtom change
  const filteredTodosAtom = Atom.make((get) =>
    applyFilter(get(todosAtom), get(filterAtom)),
  );
  const remainingCountAtom = Atom.make(
    (get) => get(todosAtom).filter((t) => !t.completed).length,
  );

  // 4. Effectful atom: runs the Effect when mounted, exposes AsyncResult, and
  // interrupts it (closing its Scope) when the atom is no longer used.
  const loadTodosAtom = runtime.atom(
    Effect.gen(function* () {
      const api = yield* TodoApi;
      const todos = yield* api.getTodos;
      yield* Atom.set(todosAtom, todos);
      return todos.length;
    }),
  );

  // 5. Effectful function atom: write a title to run it; value is an AsyncResult
  // (waiting flag = pending, Failure = typed error from the service).
  /**
   * @see {@link ./todoAtoms.md for a description of the addTodoAtom pattern}
   */
  const addTodoAtom = runtime.fn<string>()(
    Effect.fnUntraced(function* (title) {
      const api = yield* TodoApi;
      const todo = yield* api.createTodo(title);
      yield* Atom.update(todosAtom, (prev) => [...prev, todo]);
      return todo;
    }),
  );

  return {
    todosAtom,
    filterAtom,
    filteredTodosAtom,
    remainingCountAtom,
    loadTodosAtom,
    addTodoAtom,
  };
};
