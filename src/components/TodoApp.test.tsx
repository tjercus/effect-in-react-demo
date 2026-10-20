import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegistryProvider } from "@effect/atom-react";
import { Effect, Layer } from "effect";
import { TodoApi, TodoApiError, type Todo } from "../services/TodoApi";
import { makeTodoAtoms } from "../state/todoAtoms";
import { TodoApp } from "./TodoApp";

const api = vi.hoisted(() => ({
  getTodos: vi.fn<() => Effect.Effect<ReadonlyArray<Todo>, TodoApiError>>(),
  createTodo: vi.fn<(title: string) => Effect.Effect<Todo, TodoApiError>>(),
}));

vi.mock("../state", () => ({
  todoAtoms: makeTodoAtoms(
    Layer.succeed(TodoApi, {
      getTodos: Effect.suspend(() => api.getTodos()),
      createTodo: (title) => api.createTodo(title),
    }),
  ),
}));

beforeEach(() => {
  api.getTodos.mockReset().mockReturnValue(
    Effect.succeed([
      { id: "1", title: "Build Effect SPA", completed: false },
      { id: "2", title: "Integrate React 19", completed: true },
    ]).pipe(Effect.delay("10 millis")),
  );
  api.createTodo
    .mockReset()
    .mockImplementation((title) =>
      Effect.succeed({ id: "3", title: title.trim(), completed: false }).pipe(
        Effect.delay("100 millis"),
      ),
    );
});

const renderApp = () =>
  render(
    <RegistryProvider>
      <TodoApp />
    </RegistryProvider>,
  );

describe("<TodoApp />", () => {
  it("shows loading state then the fetched todos", async () => {
    renderApp();
    expect(screen.getByText("Loading todos...")).toBeInTheDocument();
    expect(await screen.findByText("Build Effect SPA")).toBeInTheDocument();
    expect(screen.getByText("Integrate React 19")).toBeInTheDocument();
    expect(screen.getByText("1 item(s) left")).toBeInTheDocument();
  });

  it("adds a todo through the Effect service and disables the form while pending", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Build Effect SPA");

    await user.type(screen.getByLabelText("New todo"), "Write README");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("button", { name: "Adding..." })).toBeDisabled();
    expect(screen.getByLabelText("New todo")).toHaveValue("Write README");
    expect(await screen.findByText("Write README")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("New todo")).toHaveValue(""));
  });

  it("prevents submission before the initial load completes", () => {
    api.getTodos.mockReturnValue(Effect.never);
    renderApp();

    const input = screen.getByLabelText("New todo");
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "Too early" } });
    fireEvent.submit(screen.getByRole("form", { name: "Add todo" }));

    expect(api.createTodo).not.toHaveBeenCalled();
  });

  it("does not submit empty or whitespace-only titles", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Build Effect SPA");

    const input = screen.getByLabelText("New todo");
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    await user.type(input, "   ");
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "Add todo" }));

    expect(api.createTodo).not.toHaveBeenCalled();
    expect(input).toHaveValue("   ");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not start another submission while one is pending", async () => {
    const user = userEvent.setup();
    api.createTodo.mockReturnValue(Effect.never);
    renderApp();
    await screen.findByText("Build Effect SPA");

    await user.type(screen.getByLabelText("New todo"), "Pending todo");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(api.createTodo).toHaveBeenCalledExactlyOnceWith("Pending todo");
    fireEvent.submit(screen.getByRole("form", { name: "Add todo" }));

    expect(api.createTodo).toHaveBeenCalledExactlyOnceWith("Pending todo");
    expect(screen.getByLabelText("New todo")).toBeDisabled();
  });

  it("preserves a failed submission and allows retrying it", async () => {
    const user = userEvent.setup();
    api.createTodo.mockReturnValueOnce(
      Effect.fail(new TodoApiError({ message: "Service unavailable" })),
    );
    renderApp();
    await screen.findByText("Build Effect SPA");

    await user.type(screen.getByLabelText("New todo"), "Keep my draft");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not add todo.");
    expect(api.createTodo).toHaveBeenCalledExactlyOnceWith("Keep my draft");
    expect(screen.getByLabelText("New todo")).toHaveValue("Keep my draft");
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Keep my draft")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("New todo")).toHaveValue(""));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("surfaces a load failure and allows retrying without enabling early additions", async () => {
    const user = userEvent.setup();
    api.getTodos.mockReturnValueOnce(
      Effect.fail(new TodoApiError({ message: "Service unavailable" })),
    );
    renderApp();

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load todos.");
    expect(screen.getByLabelText("New todo")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Build Effect SPA")).toBeInTheDocument();
    expect(screen.getByLabelText("New todo")).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(api.getTodos).toHaveBeenCalledTimes(2);
  });

  it("toggles todos and filters them", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Build Effect SPA");

    await user.click(screen.getByLabelText("Build Effect SPA"));
    expect(screen.getByText("0 item(s) left")).toBeInTheDocument();

    await user.click(screen.getByLabelText("active"));
    expect(screen.queryByText("Build Effect SPA")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("completed"));
    const list = screen.getByRole("list", { name: "Todos" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("removes a todo", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Build Effect SPA");

    await user.click(screen.getByRole("button", { name: "Delete Build Effect SPA" }));
    expect(screen.queryByText("Build Effect SPA")).not.toBeInTheDocument();
  });
});
