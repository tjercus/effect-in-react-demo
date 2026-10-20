---
applyTo: "**/*.tsx"
---

metadata:
 - version: 3.0.0
 - last-updated: 2026-09-30

This is a highly disciplined, enterprise-grade style guide. It marries classic architecture (the Container/Presenter pattern) with the strict safety of Functional Programming (Option/Maybe for local state, declarative views etc).
Align on this so you will end up with a codebase that is highly predictable, testable, and mostly immune to the classic JavaScript null/undefined runtime crashes.

## Architectural Principles

### Functional-core/imperative-shell

- If unknown, see [functional-core-imperative-shell](https://github.com/allousas/functional-core-imperative-shell)
- The functional core should be pure and free of side effects, while the imperative shell handles side effects and interacts with the outside world. Pure functions should have 100% test coverage (if possible), while the imperative shell can have less coverage.

The main pattern is to use a repeatable 2-layer split:

#### Pure core
 - accepts explicit inputs
 - returns value or command description
 - contains of pure functions
 - Mostly the .ts files (excluding custom hooks which are tied to React and therefore belong in the shell)

#### Imperative shell
 - reads globals (window, storage, i18next)
 - invokes side effects
 - delegates all branching logic to pure core
 - Mostly the .tsx files (React views and containers including ALL custom hooks)

The core returns commands; the shell interprets them.

Typed commands should always be declared inside the Functional Core (in the file declaring the functions that comprise the core) or in a types file that lives in the same package as the functions.

The golden rule of the Functional-Core/Imperative-Shell architecture is: The Core must never depend on the Shell.

Because your core functions need to return these commands, the Core has to know about their types. Therefore, the types must live in the Core. The Shell then imports both the functions and the types from the Core.

### Container/Presenter (inside the imperative shell)

- Use container/presenter pattern to separate logic from UI.
- Use Stateful Container Components and Functional Presentational Components. The former handles state, connecting with concerns outside the view layer and logic. The latter just displays what it receives via props. It connects eventHandler functions (declared in the parent Container and passed to the View via props) to eventHandler hooks in the view templates.
- Logic that the Container declares should be placed in the utils file for the package (if possible) it should be called '<feature-name>Utils.ts'. If a function can be reused in other packages it should be placed in an appropriate file in the `common` directory.

### Custom Hooks

- If a container's logic requires orchestration of multiple hooks, that logic belongs in a Custom Hook (e.g., useMyComponentLogic.ts) rather than a pure '<compent-name>Utils.ts' file.
- A React hook is firmly part of the Imperative Shell.
- If a `useX` function is 100% pure, it belongs in the Functional Core.
In this case, you should actually remove the `use` prefix from the function name. Naming a completely pure function with a use prefix (like useCalculateTotal) tricks the React compiler and ESLint rules into thinking it must follow the strict "Rules of Hooks" (e.g., it can't be called inside loops or conditions), which needlessly restricts where you can use your pure core logic.

## React Guidelines

- Use React as the frontend framework to align with other frontend projects and team knowledge.
- Use functional components with hooks not class based components.
- Follow the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).
- Keep components small and focused.
- (CRITICAL) Keep business logic out of view components.
- (MINOR) Use `React.lazy` and `Suspense` for code splitting.
- Use `useState` for local state and the projects state management library (defaults to Redux) for global state.
- Use collocated CSS/SCSS and test files for component cohesion.
- Order React imports from far to near, so from public (third-party) to local, separated by comment lines.
- Use our custom 'Conditional' component for conditional rendering instead of using &&.
- Name callbacks consistently, prefer handleOnChange over onChangeCb.
- If a component uses multiple eventhandlers as props group them in an 'eventHandlers' prop object. IMPORTANT: this object must be memoized in the container using useMemo to avoid unnecessary re-renders.
- (MEDIUM) Every clickable component, list component and table component should have a 'data-testid' attribute to make it easier to select in component tests. Use the format `data-testid="<card|btn|table|list|title|header|dropdown|input|modal|etc.>-component-name"` ('<component-name>' could also be '<feature-name>'). Note that e2e tests can use other selectors to navigate the DOM, so this guideline is only for component tests.
- (CRITICAL) never use null or undefined as a value for the useState. If the value is nullable use a Option/Maybe.
- (CRITICAL) in the view layer (the tsx files) try to keep the code as declarative as possible. Use utility functions from common/utils.ts or other utils to reduce low level programming constructs.
- sort props alphabetically in the component declarations

### Optionality and default values

- (MEDIUM) when a prop is optional USE the `?` operator to declare optionality, AND use a Option/Maybe as the type. name the prop with a `Option/Maybe` postfix, for example `reportTypeOption` or `reportTypeMaybe`.
- (MEDIUM) provide default values for all props that are optional. Use `EmptyFunction` for function props that are not required. Use Option.none() or Maybe.empty() for Option/Maybe props.

Example for using Effect for ADTs:

```tsx
import { Option } from "effect";

interface Props {
  reportTypeOption?: Option.Option<ReportType>; // Rule 1: ? operator + Option type
  onClick?: () => void;               // Standard optional function
}

export const MyComponent = ({
  reportTypeOption = Option.none(),     // Rule 2: Default to Option.none()
  onClick = EmptyFunction              // Rule 2: Default to EmptyFunction
}: Props) => {

  // Inside the component:
  // - reportTypeOption is strictly guaranteed to be an `Option.Option<ReportType>`
  // - onClick is strictly guaranteed to be a callable function
  
  return (
    <button onClick={onClick}>
      {Option.getOrElse(
        Option.map(reportTypeOption, (report) => report.name),
        () => "No Report",
      )}
    </button>
  );
};
```

Example for when using Purify for ADTs:

```tsx
interface Props {
  reportTypeMaybe?: Maybe<ReportType>; // Rule 1: ? operator + Maybe type
  onClick?: () => void;               // Standard optional function
}

export const MyComponent = ({
  reportTypeMaybe = Maybe.empty(),     // Rule 2: Default to Maybe.empty()
  onClick = EmptyFunction              // Rule 2: Default to EmptyFunction
}: Props) => {

  // Inside the component:
  // - reportTypeMaybe is strictly guaranteed to be a `Maybe<ReportType>`
  // - onClick is strictly guaranteed to be a callable function
  
  return (
    <button onClick={onClick}>
      {reportTypeMaybe.map(report => report.name).getOrElse("No Report")}
    </button>
  );
};
```

### Don't use React.FC

(MAJOR) React.FC does a few things behind the scenes that can quietly mislead developers:

 - It allows invalid default prop values without error.
 - It hides unused props, so TypeScript doesn’t warn you about dead code.
 - It breaks type inference for generics, making reusable components harder to type.

```tsx
// Before
const Card: React.FC<CardProps> = ({ title }) => <div>{title}</div>

// After
const Card = ({ title }: CardProps): React.ReactNode => <div>{title}</div>
```
