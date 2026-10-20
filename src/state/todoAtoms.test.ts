import { describe, expect, it } from "vite-plus/test";
import { AsyncResult, AtomRegistry } from "effect/reactivity";
import { makeTodoApiLayer } from "../services/TodoApi";
import { applyFilter, makeTodoAtoms } from "./todoAtoms";

const todos = [
  { id: "1", title: "a", completed: false },
  { id: "2", title: "b", completed: true },
];

const setup = () => {
  const atoms = makeTodoAtoms(makeTodoApiLayer({ latencyMs: 0 }));
  const registry = AtomRegistry.make();
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
    await waitFor(() => AsyncResult.isSuccess(registry.get(atoms.loadTodosAtom)));

    expect(registry.get(atoms.todosAtom).map((t) => t.title)).toEqual([
      "Build Effect SPA",
      "Integrate React 19",
    ]);
  });

  it("adds a todo via the effectful function atom", async () => {
    const { atoms, registry } = setup();
    registry.mount(atoms.addTodoAtom);
    registry.set(atoms.addTodoAtom, "  write tests ");
    await waitFor(() => !registry.get(atoms.addTodoAtom).waiting);

    const result = registry.get(atoms.addTodoAtom);
    expect(AsyncResult.isSuccess(result)).toBe(true);
    expect(registry.get(atoms.todosAtom).map((t) => t.title)).toEqual(["write tests"]);
    expect(registry.get(atoms.todosAtom)[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("surfaces typed service failures as AsyncResult.Failure", async () => {
    const { atoms, registry } = setup();
    registry.mount(atoms.addTodoAtom);
    registry.set(atoms.addTodoAtom, "   ");
    await waitFor(() => !registry.get(atoms.addTodoAtom).waiting);

    const result = registry.get(atoms.addTodoAtom);
    expect(AsyncResult.isFailure(result)).toBe(true);
    expect(registry.get(atoms.todosAtom)).toHaveLength(0);
  });
});

async function waitFor(predicate: () => boolean, timeoutMs = 1000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 5));
  }
}
