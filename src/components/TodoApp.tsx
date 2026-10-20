import { useState, type FormEvent } from "react";
import { Exit } from "effect";
import { AsyncResult } from "effect/reactivity";
import {
  useAtom,
  useAtomMount,
  useAtomRefresh,
  useAtomSet,
  useAtomValue,
} from "@effect/atom-react";
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
  const retryLoad = useAtomRefresh(loadTodosAtom);

  const setTodos = useAtomSet(todosAtom);
  const [filter, setFilter] = useAtom(filterAtom);
  const filteredTodos = useAtomValue(filteredTodosAtom);
  const remaining = useAtomValue(remainingCountAtom);
  const [addResult, addTodo] = useAtom(addTodoAtom, { mode: "promiseExit" });

  const [text, setText] = useState("");
  const isAdding = addResult.waiting;
  const isFormDisabled = isAdding || !AsyncResult.isSuccess(loadResult) || loadResult.waiting;

  const handleAdd = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (text.trim() && !isFormDisabled) {
      const result = await addTodo(text);
      if (Exit.isSuccess(result)) {
        setText("");
      }
    }
  };

  const toggleTodo = (id: string) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

  const removeTodo = (id: string) => setTodos((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="window todo-app">
      <div className="title-bar">
        <div className="title-bar-text">Effect v4 SPA Todos</div>
      </div>
      <div className="window-body">
        <form aria-label="Add todo" className="field-row" onSubmit={handleAdd}>
          <label htmlFor="new-todo">New todo</label>
          <input
            className="todo-app__input"
            data-testid="input-new-todo"
            disabled={isFormDisabled}
            id="new-todo"
            onChange={(e) => setText(e.target.value)}
            type="text"
            value={text}
          />
          <button
            data-testid="btn-add-todo"
            disabled={isFormDisabled || !text.trim()}
            type="submit"
          >
            {isAdding ? "Adding..." : "Add"}
          </button>
        </form>

        {AsyncResult.isFailure(addResult) && <p role="alert">Could not add todo.</p>}

        <div aria-label="Filter" className="field-row todo-app__filters" role="radiogroup">
          {filters.map((f) => (
            <div key={f}>
              <input
                checked={filter === f}
                data-testid={`input-filter-${f}`}
                id={`filter-${f}`}
                name="filter"
                onChange={() => setFilter(f)}
                type="radio"
              />
              <label htmlFor={`filter-${f}`}>{f}</label>
            </div>
          ))}
        </div>

        {AsyncResult.match(loadResult, {
          onInitial: () => <p role="status">Loading todos...</p>,
          onFailure: () => (
            <div>
              <p role="alert">Failed to load todos.</p>
              <button
                data-testid="btn-retry-load"
                disabled={loadResult.waiting}
                onClick={retryLoad}
                type="button"
              >
                Retry
              </button>
            </div>
          ),
          onSuccess: () => (
            <ul aria-label="Todos" className="tree-view" data-testid="list-todos">
              {filteredTodos.map((todo) => (
                <li key={todo.id}>
                  <div className="field-row">
                    <input
                      checked={todo.completed}
                      data-testid={`input-todo-${todo.id}`}
                      id={`todo-${todo.id}`}
                      onChange={() => toggleTodo(todo.id)}
                      type="checkbox"
                    />
                    <label
                      className={`todo-app__title${todo.completed ? " todo-app__title--completed" : ""}`}
                      htmlFor={`todo-${todo.id}`}
                    >
                      {todo.title}
                    </label>
                    <button
                      aria-label={`Delete ${todo.title}`}
                      data-testid={`btn-delete-todo-${todo.id}`}
                      onClick={() => removeTodo(todo.id)}
                      type="button"
                    >
                      X
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ),
        })}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{remaining} item(s) left</p>
      </div>
    </div>
  );
}
