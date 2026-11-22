---
title: Consultancy management system
description: Bespoke software for running a small consultancy, tracking consultants, contracts, clients, jobs and utilization. A Rails 8 API with a SvelteKit frontend, behind Nginx in Docker.
date: 2026-02-01
stack:
  [
    Ruby on Rails,
    PostgreSQL,
    SvelteKit,
    TypeScript,
    TanStack Query,
    RSpec,
    Storybook,
    Docker,
    Nginx,
  ]
repo: https://github.com/ABaulderstone/consultancy-management-system
---

## Why build it

I was applying for a job that used Rails and Svelte, and I wanted to give myself the best chance. That meant building something with a bit of teeth, not just working through a tutorial. So I picked software I'd actually use in my day job: our consultancy is very lean, and something that tracks consultants, jobs and utilization would be genuinely useful.
I actually used this app as a demo to pitch to my boss; sadly we did not end up building it.

There were two other reasons. I've wanted to build something with Svelte ever since Rich Harris's [Rethinking Reactivity](https://www.youtube.com/watch?v=AdNJ3fydeao) talk. And after several years in Java and Spring, I wanted to see how it felt to come back to Rails, and to Ruby's dynamic typing.

I actually found the dynamic type system somewhat stressful - after working with Spring for so long I was used to being able to quickly check an entity and know it's fields and invariants. I missed DTOs even more, especially when dealing with incoming requests.

## What it does

Admins create consultants, each with a profile and a history of contracts. They set up clients and jobs, and assign consultants to jobs. Consultants log in to see their assigned work and edit their own details. An admin dashboard charts profit, revenue share, utilisation and the flow of jobs.

## The backend

The backend is a Rails 8 API on PostgreSQL. A few decisions shaped it:

- **Service objects** hold the business logic, so controllers stay thin and the logic is tested on its own.
- **JWT authentication** comes in an HttpOnly signed cookie, with bearer tokens for other API clients. Role checks like `only_admin!` live in a reusable concern.
- **Business rules are enforced at more than one level.** For example, a consultant can only have one open-ended contract: a partial unique index in the database guarantees it, model validations catch it first, and creating a new contract closes the old one.
- **Consistent responses:** every error has the same shape, with field-level details for validation errors. Every list is paginated in the same envelope.

Finding who's free for a job is a good example of the business logic. A consultant qualifies if they're in a billable department, their contract runs at least as long as the job, and none of their existing assignments overlap it:

```ruby
User
  .joins(contracts: { position: :department })
  .where(departments: { billable: true })
  .where("contracts.end_date IS NULL OR contracts.end_date >= ?", job.end_date || Date.today)
  .where.not(id: conflicting_user_ids)
```

Utilisation is worked out the same way: assigned working days as a share of available working days, over a consultant's whole history or any period.

## The frontend

The frontend is SvelteKit with TypeScript. Svelte 5 had just changed its reactivity model to runes, and the third-party routers hadn't caught up, so SvelteKit's file-based routing was the easy choice. It also felt familiar after working in Next.js.

- **TanStack Query** manages server state, with caching and separate loading, fetching and error states.
- **Superforms and Zod** handle forms. Validation errors from Rails come back in the same field-level shape as the browser's, so they show inline next to the right field.
- **A typed API client** converts between Rails' snake_case and the frontend's camelCase in both directions.
- **Storybook** holds the reusable components, like the data table and form inputs, so each state (loading, empty, error, sorted) can be checked on its own.

## Running it

Docker Compose runs four services: PostgreSQL, the Rails API, the SvelteKit app, and Nginx in front. Nginx sends `/api` to Rails and everything else to the SvelteKit app, so the browser only ever talks to one origin, with no CORS or CSRF configuration to manage. A Makefile wraps the common commands, like `make dev`, `make test` and `make console`.

## Testing

The backend has RSpec model, service and request specs. Every request spec checks the response against a JSON schema, and the API docs (Swagger UI) are generated from those specs with rswag, so they can't drift from what the API actually does.

## What's next

It's still a work in progress. Next on the list are third-party integrations, a calendar of work, and upskilling pathways for consultants who are between jobs.
