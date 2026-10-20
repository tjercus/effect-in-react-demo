import { describe, expect, it, onTestFinished, vi } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { AsyncResult, AtomRegistry } from "effect/reactivity";
import { makeTodoApiLayer, TodoApi, TodoApiError } from "../services/TodoApi";
import { applyFilter, makeTodoAtoms } from "./todoAtoms";

const todos = [
  { id: "1", title: "a", completed: false },
  { id: "2", title: "b", completed: true },
];

const setup = () => {
  const atoms = makeTodoAtoms(makeTodoApiLayer({ latencyMs: 0 }));
  const registry = AtomRegistry.make();
  onTestFinished(() => registry.dispose());
  return { atoms, registry };
};

describe("applyFilter", () => {
  it("filters by completion state", () => {
    expect(applyFilter(todos, "all")).toHaveLength(2);
    expect(applyFilter(todos, "active")).toEqual([todos[0]]);
    expect(applyFilter(todos, "completed")).toEqual([todos[1]]);
  });
});

describe("todo atoms", () => {
  it("executes a failed service request once per atom write", async () => {
    const createTodo = vi.fn(() =>
      Effect.fail(new TodoApiError({ message: "Service unavailable" })),
    );
    const atoms = makeTodoAtoms(
      Layer.succeed(TodoApi, { getTodos: Effect.succeed([]), createTodo }),
    );
    const registry = AtomRegistry.make();
    onTestFinished(() => registry.dispose());
    registry.mount(atoms.loadTodosAtom);
    registry.mount(atoms.addTodoAtom);
    await vi.waitFor(() =>
      expect(AsyncResult.isSuccess(registry.get(atoms.loadTodosAtom))).toBe(true),
    );

    registry.set(atoms.addTodoAtom, "Write tests");
    await vi.waitFor(() =>
      expect(AsyncResult.isFailure(registry.get(atoms.addTodoAtom))).toBe(true),
    );

    expect(createTodo).toHaveBeenCalledExactlyOnceWith("Write tests");
  });

  it("derives filtered todos and remaining count from core atoms", () => {
    const { atoms, registry } = setup();
    registry.set(atoms.todosAtom, todos);
    expect(registry.get(atoms.filteredTodosAtom)).toHaveLength(2);
    expect(registry.get(atoms.remainingCountAtom)).toBe(1);

    registry.set(atoms.filterAtom, "completed");
    expect(registry.get(atoms.filteredTodosAtom)).toEqual([todos[1]]);
  });

  it("loads initial todos through the service layer", async () => {
    const { atoms, registry } = setup();
    registry.mount(atoms.loadTodosAtom);
    await vi.waitFor(() =>
      expect(AsyncResult.isSuccess(registry.get(atoms.loadTodosAtom))).toBe(true),
    );

    expect(registry.get(atoms.todosAtom).map((t) => t.title)).toEqual([
      "Build Effect SPA",
      "Integrate React 19",
    ]);
  });

  it("adds a todo via the effectful function atom", async () => {
    const { atoms, registry } = setup();
    registry.mount(atoms.addTodoAtom);
    registry.set(atoms.addTodoAtom, "  write tests ");
    await vi.waitFor(() => expect(registry.get(atoms.addTodoAtom).waiting).toBe(false));

    const result = registry.get(atoms.addTodoAtom);
    expect(AsyncResult.isSuccess(result)).toBe(true);
    expect(registry.get(atoms.todosAtom).map((t) => t.title)).toEqual(["write tests"]);
    expect(registry.get(atoms.todosAtom)[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("surfaces typed service failures as AsyncResult.Failure", async () => {
    const { atoms, registry } = setup();
    registry.mount(atoms.addTodoAtom);
    registry.set(atoms.addTodoAtom, "   ");
    await vi.waitFor(() => expect(registry.get(atoms.addTodoAtom).waiting).toBe(false));

    const result = registry.get(atoms.addTodoAtom);
    expect(AsyncResult.isFailure(result)).toBe(true);
    expect(registry.get(atoms.todosAtom)).toHaveLength(0);
  });
});
