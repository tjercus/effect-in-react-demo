---
applyTo: "**/*.ts,**/*.tsx"
---

metadata:
 - version: 3.0.0
 - last-updated: 2026-09-20

This file describes the SureSync TypeScript code style.
It assumes you also use React since that is the primary frontend framework, if this is an Angular project, ignore the React specific guidelines and focus on the TypeScript guidelines.
If you are using React, also read the [React guidelines](./react.instructions.md).

### Programming Key Principles

- (CRITICAL) Use functional and declarative programming instead of impertive and object-oriented programming. This leads to more predictable, testable, and maintainable code.
- Apply functional programming principles using the project's utility library ('Effect' by default), the project's pattern matching library ('Effect' by default), and the project's ADT library ('Effect' by default).
- Prefer composition over inheritance. Exception being Zod Schemas where extends is a good way to combine schemas
- prefer a composition of small functions over a single large function. This makes the code more reusable and easier to test.
- (CRITICAL) Never return null or undefined from a function or method. Instead return an optional like 'Either', 'Result' or 'Maybe', 'Option'. An exception is the view layer where React prefers null for "no-render". If returning null from a React component add a comment like "// react prefers null for no-render". (so only presentation layer components that conditionally render)
- (CRITICAL) Always use a single point of return over multiple exit points. Code flow is simpler to read in the former and is easier to debug
- (CRITICAL) Same as null and undefined, never Throw anything from a function. This will disrupt the normal flow of code. Instead return an optional like 'Result' or 'Optional'
- (MEDIUM) Ternary operators should only be used when there are exactly two possible outcomes. For more complex branching with multiple conditions, use (ts-)pattern matching instead of if/else/elseif chains or switch statements to improve readability and maintainability.
- (CRITICAL) Do not forget to add consistent braces (curlies) to return statements. See also: <https://eslint.org/docs/latest/rules/consistent-return>
- (CRITICAL) Check if all object references are not null before accessing them. You can use the Elvis (?.) operator to guard a property lookup or use the project's utility library's 'prop' or 'path' (or equivalent) functions when doing a composition.
- Prefer using lenses from the project's utility library instead of nested destructuring.
- Follow code style rules enforced by ESLint and Prettier.

### TypeScript Specific Guidelines

- Use TypeScript for type checking and to catch errors during development.
- (CRITICAL) Always use feature folders to organize code by feature rather than by type (e.g., components, utils, hooks). This promotes better modularity and maintainability.
- Shared code that is not specific to a single feature should be placed in the `common` directory. 
- (CRITICAL) Prefer immutable data (`const`, `readonly`) and use TypeScript's type system to enforce immutability where possible.
- Avoid `console.log` use the projects dedicated logger library instead.
- Document complex functions with JSDoc.
- Define explicit types for function parameters and return values.
- Use `interfaces` for object shapes and `types` for unions or aliases.
- (CRITICAL) Prefer `unknown` over `any`, and use type guards to narrow types.
- Use generics for reusable logic.
- (CRITICAL) Follow the `functional core, imperative shell` pattern. See the React guidelines for more details on how to apply this pattern in a React project.
- Prefer `Array<Jedi>` over `Jedi[]`
- (MEDIUM) Prefer `ReadonlyArray<T>` over `readonly T[]` for readonly array types. Example: use `ReadonlyArray<User>` instead of `readonly User[]`.
- Ban imperative loop constructs (`for`, `while`, `forEach`) and prefer functional array methods (`map`, `filter`, `reduce`) or recursion instead.
- Mutating methods like `.push()`, `.pop()`, `.sort()` must be rejected. Insist on functional utilities like lenses or native non-mutating primitives (`toSorted()`, `.concat()`).
- Do not install new dependencies without team consensus.
- BEFORE adding a new utility function, check if it can be implemented with existing utilities from the `common` dir or or the projects functional utility library. If not, add it to the utility library and make sure to add tests for it.

## Naming Conventions

- Use **PascalCase** for component names, interfaces, and type aliases.
- Use **camelCase** for variables, functions, and methods.
- Use **ALL_CAPS** for constants.
- Choose lowercase for your packages, so /src/customerlogin/ instead of /src/CustomerLogin/ even though the React components inside follow a 'Pascal Case' strategy CustomerLoginView.jsx
- A pure function that creates something from nothing is by preference prefixed by 'create'
- A pure function that builds something from an input is by preference prefixed by 'make'
- Prefer `makeX(param)` over `getX(param)` for pure computation functions: `get` belongs in the HTTP / data-access domain (RTK Query hooks, API calls), not in idiomatic functional programming
- A presentational component is named: 'SubjectView.tsx' or 'SubjectPage.tsx' (depending on the context)
- A container component is named: 'SubjectContainer.tsx'
- A page/scene is named: 'SubjectPage.tsx'
- Utils for a package/module is named: 'subjectUtils.ts'
- use 'is' or 'has' to start a boolean variable name

## Further reading

ALWAYS read the [specific TypeScript instructions](./typescript-specific.instructions.md) for more detailed instructions on how to write TypeScript code in THIS project.
