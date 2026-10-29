
## Why are the function loadTodosAtom and addTodoAtom built in distinct ways, the one needing runtime.atom and the other runtime.fn ?

They represent two different interaction patterns:

loadTodosAtom is *a no-argument effect atom*. It should run when the app starts, so useAtomMount(loadTodosAtom) starts the fetch as the component mounts. Its AsyncResult exposes loading, success, or failure, and the component can refresh it to retry.

addTodoAtom is *an effectful function atom*. Adding is a user-triggered action and needs a title supplied at submission time. The component gets a callable setter from useAtom(addTodoAtom, ...), then invokes it with the title.
So the choice is about when the effect runs and whether it needs an argument: runtime.atom for work driven by the atom’s lifecycle; runtime.fn for work explicitly invoked with input. Both use the same runtime and service layer, and both expose async status. addTodoAtom is invoked via the hook’s returned function—not by passing the title directly to the atom.

## addTodoAtom

That snippet leverages a specialized Effect v4 atom pattern called an
effectful function atom (often exposed via runtime.fn() or similar
reactive action wrappers).
Instead of manually wiring up React state, useTransition, and imperative
setTodos calls inside component event handlers, this pattern lets you treat
an Effect workflow as a first-class reactive function bound directly to
the atom graph.

Here is why that design is powerful and what each part is doing:

1.  Automatic AsyncResult Wrapping (Loading & Error State for Free)
    When you wrap an Effect workflow in a function atom (runtime.fn()),
    calling that function doesn't just return a raw Promise—it returns or
    manages an AsyncResult (or tracks an internal execution state).
    waiting / pending: Automatically flags when the effect is in flight.
    You don't need a separate isPending state or useTransition hook in your
    component.
    Failure: Automatically catches typed errors from your service
    (Effect.Effect<Todo, Error>) without throwing unhandled promise rejections
    or crashing your UI boundary.
2.  Elimination of Component-Side Boilerplate
    With the function atom, the state transition is encapsulated right where
    the logic lives. The component simply calls addTodoAtom(title), and any
    component subscribed to it instantly knows if it's running, succeeded,
    or failed.
3.  Co-located State Updates (Atom.update inside the Effect)
    Instead of passing data back to the React component and letting the UI call setTodos, the Effect updates its own state graph directly upon success.

        - The database call succeeds -> the new todo is generated -> todosAtom is transactionally updated -> any derived atoms (filteredTodosAtom, counters, etc.) automatically recalculate.
        - The React component becomes a pure renderer reacting to state changes rather than an orchestrator of async side effects.

4.  Full Effect Runtime & Context Integration

Because it's wrapped in Effect.fnUntraced (or Effect.gen) and executed via the runtime, it has full access to your Dependency Injection layers (TodoApi). It knows exactly how to provision services, handle scopes, or execute tracing without passing down props or context hooks manually.
