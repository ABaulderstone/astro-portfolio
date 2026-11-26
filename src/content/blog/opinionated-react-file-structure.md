---
title: An opinionated React file structure
description: How I lay out a React TypeScript frontend - pure UI components kept apart from features, a strict one-way dependency rule, Storybook as a visual library, Vitest for logic and Playwright with a mocked backend for everything that crosses the network.
pubDate: 2026-11-26
tags: [React, TypeScript, Storybook, Vitest, Playwright, Architecture]
---

When I was first learning to code, I started with Ruby on Rails; an extremely convention heavy framework. When I shifted over to React I was warned "JavaScript is the wild west" and I didn't really know what that meant. Basically, React doesn't tell you where to put anything. Great for starting out, solo projects, and fast prototyping. But I as I touched more and more codebases I realised that there is no real consensus about how to structure your files, and every team I've ever worked with had a different idea of "best practice". After several "good enough for now" projects, I started working on a file system that makes sense **to me**. There's still some gaps here of course, and I'll likely keep iterating on this, but if you're not sure how to keep your files in order, have a look.

I'm using this [Spring Boot / React todo app](https://github.com/ABaulderstone/spring_react_todo_app/tree/main/frontend) borrowed from a class I taught as an example. If you're anything like me you're probably sick to death of Todo apps, but that's kind of the point. You shouldn't have to think about the domain at all.

## The shape of it

Here's the `src/` folder, trimmed a little:

```text
src/
├── ui/
│   └── components/
│       ├── Button/
│       │   ├── Button.tsx
│       │   └── Button.stories.tsx
│       ├── IconButton/
│       │   ├── IconButton.tsx
│       │   ├── IconButton.stories.tsx
│       │   └── IconButton.test.tsx
│       ├── Form/
│       │   ├── Input/  Select/  TextArea/  FieldGroup/
│       │   ├── Form.tsx
│       │   └── field-styles.ts
│       └── Modal/  Alert/  Spinner/  Switch/  ExpandButton/
├── lib/
│   ├── api-error.ts
│   ├── query-client.ts
│   └── utils/
│       ├── date-utils.ts (+ .test.ts)
│       └── text-utils.ts (+ .test.ts)
├── features/
│   ├── categories/
│   │   ├── api/  hooks/  types.ts
│   └── todos/
│       ├── api/
│       │   ├── todo-api.ts (+ .test.ts)
│       │   └── todo-mappers.ts (+ .test.ts)
│       ├── components/
│       │   ├── TodoForm/        (form + zod schema)
│       │   ├── CreateTodoForm/  EditTodoForm/
│       │   ├── TodoRow/  TodoList/  DueDate/
│       │   └── DeleteTodoDialog/
│       ├── hooks/todo-hooks.ts
│       ├── utils/todo-utils.ts (+ .test.ts)
│       └── types.ts
├── pages/
│   └── TodosPage/
└── App.tsx
```

There are four layers, and the whole structure rests on one rule about which way imports are allowed to point:

```text
App / pages  →  features  →  ui + lib
```

- **`ui/`** is a component library. Buttons, inputs, modals, spinners. It knows nothing about todos.
- **`lib/`** is the non-visual equivalent: generic helpers (dates, text), the API error type, the query client.
- **`features/`** is where the app actually lives. Each feature owns its types, its API calls, its React Query hooks, its utilities and the components that only make sense for that feature.
- **`pages/`** and **`App.tsx`** wire features together and decide what's on screen.

Each component gets its own folder, holding the component, its stories and its tests. When I open `TodoForm/` I can see everything about `TodoForm` - including its zod schema and constants - without hunting through a parallel `__tests__/` or `stories/` tree.

## Pure UI components on their own

Everything in `ui/` is a pure, presentational component: props in, markup out. No data fetching, no global state, no knowledge of the domain. Here's `Button`:

```tsx
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-accent text-white hover:bg-accent/90',
  secondary: 'border-accent/40 bg-accent/8 text-accent hover:bg-accent/15',
  danger: 'border-transparent bg-red-500 text-white hover:bg-red-500/90',
  warning: 'border-transparent bg-amber-600 text-white hover:bg-amber-600/90',
};

interface ButtonProps extends Omit<ComponentProps<'button'>, 'className'> {
  variant?: ButtonVariant;
}

export default function Button({
  variant = 'primary',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`... ${variantClasses[variant]}`}
    />
  );
}
```

A few opinions are baked in here:

- **It extends the native element's props**, so anything a `<button>` accepts (`disabled`, `onClick`, `aria-*`) just works, and I don't have to keep adding pass-through props.
- **It removes `className`.** Your milage may vary here, sometimes you want to override defaults and that's fine but if callers can pass arbitrary classes, before you know it there'll be 11 slightly different buttons in your app. Instead, this design encourages building a **system** the ways a button is allowed to look are listed as `variant`s. We could extend this with size variants etc, but for an app of this size it's totally fine.
- **It defaults `type` to `"button"`.** A plain `<button>` inside a form submits it, which is almost never what you want from an arbitrary button - I once helped a junior debug an issue with an information dialog button that was submitting their form, a lesson I think neither of us will ever forget - The safe default lives in the component so nobody has to remember it.

## No creep from features into UI

The part of this structure I care most about is the dependency rule: **`ui/` imports from React, third-party libraries and other `ui/` components, and nothing else.** `Modal` may use `IconButton` for its close button; `Button` may never import a `Todo` type.

My test for whether something belongs in `ui/` is: **could I copy the folder into an unrelated project and have it work?** (I am actually playing with the idea of turning the whole UI folder into an npm package but that's a post for another day)

That rule pushes a few decisions:

**Small, domain-aware components stay in the feature.** `DueDate` is a single `<time>` element - about as small as a component gets - but it takes a `Todo` and colours itself by how soon it's due. That makes it a todo component, so it lives in `features/todos/components/`, not `ui/`.

**Feature components are split into "connected" and "pure".** `TodoForm` renders the fields and buttons and takes everything it needs as props: the `react-hook-form` methods, the list of categories, `onSubmit` and `onCancel`. It doesn't fetch or mutate anything. `CreateTodoForm` and `EditTodoForm` are the connected wrappers: they call `useCategories()` and `useCreateTodo()`, handle loading and server errors, and render `TodoForm`. The same split happens with `TodoRow`, which receives `onEdit`, `onDelete` and `onToggleComplete` callbacks rather than reaching for mutations itself. This is the old container/presentational pattern, but applied inside a feature rather than as a top-level folder split.

**Logic is pulled out of components into plain functions.** Working out what `DueDate` should say ("Due in 5 hours", "Overdue by 2 days") is `getDueStatus(todo, now)` in `features/todos/utils/todo-utils.ts`. Turning API responses into app types (ISO strings into `Date`s, blank strings into `null`) is in `todo-mappers.ts`. Generic helpers that don't know about todos, like `formatDuration` and `capitalizeAll`, go one level further down into `lib/`.

**Pages and `App` own the wiring.** `TodosPage` calls `useTodos()` and `useSetTodoComplete()`, handles the loading, error and empty states, and passes data and callbacks down. `App` holds the modal state and decides which dialog is open.

Right now the rule is a convention I keep in my head. On a team I'd enforce it, with ESLint's `no-restricted-imports` (or `eslint-plugin-boundaries`) set to fail any file in `src/ui/` that imports from `src/features/`. A rule that only lives in a README gets broken the first time someone's in a hurry.

## Storybook as a visual library

Because the components in `ui/` are pure, they're trivial to put in [Storybook](https://storybook.js.org/). There are no providers to set up and nothing to mock, so a story is just a set of props:

```tsx
const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Save Todo',
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Danger: Story = { args: { variant: 'danger' } };
export const Warning: Story = { args: { variant: 'warning' } };
```

The story titles mirror the folders: `UI/Button`, `UI/Modal`, then `Todos/TodoRow`, `Todos/DueDate`. Opening Storybook gives you the component library first and the feature components after, which is a decent map of the app for someone new to it.

The pure feature components get stories too, and this is where the connected/pure split pays off again. `TodoRow` takes a `Todo` and three callbacks, so its stories are just different todos: with and without a description, without a due date, without a category, completed, a long multi-line description. Edge cases that are annoying to set up in a running app (a todo with no category, say, which means editing the database) take one line each:

```tsx
export const WithoutCategory: Story = {
  args: { todo: makeTodo({ category: null }) },
};

export const Completed: Story = {
  args: { todo: makeTodo({ isComplete: true }) },
};
```

`makeTodo` is a small factory in `features/todos/utils/test-utils.ts` that returns a valid `Todo` with any fields overridden. The stories and the unit tests both use it, so there's one definition of "a typical todo".

Because `DueDate` takes `now` as a prop rather than calling `new Date()` itself, its stories pin the clock. "Due soon" is always due soon, rather than turning into "overdue" the day after you write it.

I don't use Storybook as a testing tool in this project. It's a catalogue: somewhere to see every component in every state, check a change to `Button` against all four variants, and build UI before the endpoint behind it exists.

## Vitest for functions (and sometimes components)

Most of my [Vitest](https://vitest.dev/) tests are for plain functions, because that's where I've moved the logic. `getDueStatus` has the most branches in the app, and as a pure function with the clock passed in, it's easy to test:

```ts
const HOUR_MS = 60 * 60 * 1000;
const base = new Date('2026-10-27T09:00:00Z');
const hoursAfter = (hours: number) =>
  new Date(base.getTime() + hours * HOUR_MS);

it('has soon tone, when due within threshold', () => {
  const todo = makeTodo({ due: hoursAfter(5), isOverdue: false });
  expect(getDueStatus(todo, base)).toEqual({
    label: 'Due in 5 hours',
    tone: 'soon',
  });
});

it('Handles server clock being slightly out of sync', () => {
  const todo = makeTodo({ due: hoursAfter(-0.1), isOverdue: false });
  expect(getDueStatus(todo, base)).toEqual({
    label: 'Due Now',
    tone: 'soon',
  });
});
```

The same goes for the mappers, the zod schema and the generic date and text helpers in `lib/`. None of these tests render anything, so they run in milliseconds.

I write component tests occasionally, when a component has **behaviour** worth pinning down rather than just markup. `IconButton` has a test that clicking it inside a form doesn't submit the form, which is exactly the kind of bug the `type="button"` default exists to prevent. `ExpandButton`'s tests check it's named by its label and reports `aria-expanded`. `TodoForm`'s tests fill in the fields with Testing Library's `user-event` and check what `onSubmit` receives: that a missing title shows "Title is required" and marks the field `aria-invalid`, that the title is trimmed, and that Cancel doesn't submit.

Notice what isn't there: tests that `Button` renders a button, or snapshot tests of `TodoRow`'s markup. If the only thing a test checks is the JSX I just wrote, Storybook is a better way to look at it.

All the queries go through accessible roles and labels (`getByRole("button", { name: "Save" })`, `getByLabelText("Title")`), so the tests double as a check that the components can be found by a screen reader as well as by a test.

## Playwright, with the backend mocked

Anything that involves the network - loading states, server errors, a list refetching after a mutation - goes to [Playwright](https://playwright.dev/). These tests run the real app in a real browser, but **no backend**: every API call is intercepted with `page.route` and answered by the test.

Playwright's config builds the app against a fake host, `http://mock-api.test`, and `e2e/mock-api.ts` gives each test a small API to describe what the server should do:

```ts
export const mockApi = async (page: Page) => {
  const handlers = new Map<string, Handler>();
  const requests: { method: string; path: string; body: unknown }[] = [];

  await page.route(`${MOCK_API_URL}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    requests.push({ method, path, body: request.postDataJSON() });

    const handler = handlers.get(`${method} ${path}`);
    if (handler) return handler(route);
    return route.fulfill({
      status: 501,
      json: { message: `No mock for ${method} ${path}` },
    });
  });

  const api = {
    requests,
    on(method: Method, path: string, handler: Handler) {
      handlers.set(`${method} ${path}`, handler);
      return api;
    },
  };

  api.on('GET', '/todos', json([])).on('GET', '/categories', json(categories));
  return api;
};
```

Three details make this work well:

- **Unmocked requests fail loudly.** Anything without a handler gets a 501 naming the request, so a test that forgets a mock fails straight away with a useful message, instead of hanging until it times out.
- **Every request is recorded.** `api.requests` lets a test check what the frontend actually sent, such as that saving a todo with the "Work" category posts `categoryId: 2`.
- **Responses can be held back.** `deferred()` holds a request open until the test calls `release()`. That's what makes loading states testable, without sleeps or flaky timing.

Here's a test that uses all of it. The create request is held while the test checks that Save is disabled, then answered with a 400 to check the server's message reaches the user:

```ts
test('disables save while submitting, then shows the server error', async ({
  page,
}) => {
  const api = await mockApi(page);
  const create = deferred(apiError(400, 'Title already exists'));
  api.on('POST', '/todos', create.handler);

  await page.goto('/');
  await page.getByRole('button', { name: 'Add Todo' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Todo' });
  await dialog.getByLabel('Title').fill('Buy milk');
  const save = dialog.getByRole('button', { name: 'Save' });
  await save.click();

  await expect(save).toBeDisabled();

  create.release();

  const alert = dialog.getByRole('alert');
  await expect(alert).toContainText("Couldn't save Todo");
  await expect(alert).toContainText('Title already exists');
  await expect(save).toBeEnabled();
  await expect(dialog).toBeVisible();
});
```

Try producing a 400 with a half-second delay from a real Spring Boot backend on demand. With the API mocked, each test sets up exactly the server it needs in a couple of lines, the suite needs no database or Java, and it runs the same in any environment

The trade-off is that these tests trust the mocks match the real API. The mocks are typed with the same `TodoResponse` and `CategoryResponse` types the app uses, which catches most drift, and the backend has its own tests for its side of the contract. Checking the two really agree is a job for a small number of true end-to-end tests, not for every interaction.

## What goes where

| Kind of thing                                               | Tool       | Lives in                    |
| ----------------------------------------------------------- | ---------- | --------------------------- |
| How a component looks, in every state                       | Storybook  | `*.stories.tsx` next to it  |
| Logic: due dates, mappers, schemas, helpers                 | Vitest     | `*.test.ts` next to it      |
| A component's behaviour: submitting, validation, ARIA state | Vitest     | `*.test.tsx` next to it     |
| Anything over the network: loading, errors, refetching      | Playwright | `e2e/`, with the API mocked |
