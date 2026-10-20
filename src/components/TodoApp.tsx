import { useState, type FormEvent } from "react";
import { AsyncResult } from "effect/reactivity";
import { useAtom, useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { todoAtoms } from "../state";
import type { Filter } from "../state/todoAtoms";

const filters: ReadonlyArray<Filter> = ["all", "active", "completed"];

export function TodoApp() {
  const {
    todosAtom,
    filterAtom,
    filteredTodosAtom,
    remainingCountAtom,
    loadTodosAtom,
    addTodoAtom,
  } = todoAtoms;

  // Mounting the effect atom runs the initial fetch for the lifetime of this component.
  useAtomMount(loadTodosAtom);
  const loadResult = useAtomValue(loadTodosAtom);

  const setTodos = useAtomSet(todosAtom);
  const [filter, setFilter] = useAtom(filterAtom);
  const filteredTodos = useAtomValue(filteredTodosAtom);
  const remaining = useAtomValue(remainingCountAtom);
  const [addResult, addTodo] = useAtom(addTodoAtom);

  const [text, setText] = useState("");
  const isAdding = addResult.waiting;

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addTodo(text);
    setText("");
  };

  const toggleTodo = (id: string) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

  const removeTodo = (id: string) => setTodos((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="window" style={{ width: 420, margin: "2rem auto" }}>
      <div className="title-bar">
        <div className="title-bar-text">Effect v4 SPA Todos</div>
      </div>
      <div className="window-body">
        <form onSubmit={handleAdd} className="field-row">
          <label htmlFor="new-todo">New todo</label>
          <input
            id="new-todo"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isAdding}
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={isAdding}>
            {isAdding ? "Adding..." : "Add"}
          </button>
        </form>

        {AsyncResult.isFailure(addResult) && <p role="alert">Could not add todo.</p>}

        <div
          className="field-row"
          role="radiogroup"
          aria-label="Filter"
          style={{ marginBlock: "0.5rem" }}
        >
          {filters.map((f) => (
            <div key={f}>
              <input
                type="radio"
                id={`filter-${f}`}
                name="filter"
                checked={filter === f}
                onChange={() => setFilter(f)}
              />
              <label htmlFor={`filter-${f}`}>{f}</label>
            </div>
          ))}
        </div>

        {AsyncResult.isInitial(loadResult) ? (
          <p>Loading todos...</p>
        ) : AsyncResult.isFailure(loadResult) ? (
          <p role="alert">Failed to load todos.</p>
        ) : (
          <ul className="tree-view" aria-label="Todos">
            {filteredTodos.map((todo) => (
              <li key={todo.id}>
                <div className="field-row">
                  <input
                    type="checkbox"
                    id={`todo-${todo.id}`}
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                  />
                  <label
                    htmlFor={`todo-${todo.id}`}
                    style={{ textDecoration: todo.completed ? "line-through" : "none", flex: 1 }}
                  >
                    {todo.title}
                  </label>
                  <button
                    type="button"
                    aria-label={`Delete ${todo.title}`}
                    onClick={() => removeTodo(todo.id)}
                  >
                    X
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{remaining} item(s) left</p>
      </div>
    </div>
  );
}
