import { describe, expect, it } from "vite-plus/test";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegistryProvider } from "@effect/atom-react";
import { TodoApp } from "./TodoApp";

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
    expect(await screen.findByText("Write README")).toBeInTheDocument();
    expect(screen.getByLabelText("New todo")).toHaveValue("");
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
