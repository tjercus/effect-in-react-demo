import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RegistryProvider } from "@effect/atom-react";
import "xp.css/dist/XP.css";
import "./index.css";
import { TodoApp } from "./components/TodoApp";

// RegistryProvider owns the AtomRegistry that holds all atom state for the SPA.
// Layers are not passed here: they are bound to atoms via `Atom.runtime(layer)` (see src/state).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RegistryProvider>
      <TodoApp />
    </RegistryProvider>
  </StrictMode>,
);
