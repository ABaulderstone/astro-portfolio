---
# Placeholder post: replace with a real one
title: What I learned migrating a NestJS app to Spring Boot
description: Placeholder post about moving a large internal platform from NestJS and Next.js to Spring Boot and React, and what changed along the way.
pubDate: 2026-11-10
tags: [Java, Spring Boot, Migration]
---

This is a placeholder post. It's here to show how a real post will look, with headings, lists, code and quotes, so swap it for something real when you're ready.

## Why migrate at all

A short paragraph explaining the reasons: the team's skills, the client's technology ecosystem, and the pain points in the old codebase.

- Typed, layered architecture that new developers recognise
- Better fit with the client's existing services
- A chance to fix performance problems properly

## Mapping the concepts

Most NestJS ideas have a direct Spring equivalent. A controller looks familiar either way:

```java
@RestController
@RequestMapping("/api/candidates")
public class CandidateController {
    private final CandidateService service;

    public CandidateController(CandidateService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public CandidateDto get(@PathVariable Long id) {
        return service.findById(id);
    }
}
```

> Placeholder quote: the hardest part of a migration is rarely the code. It's keeping the old system running while you build the new one.

### What I'd do differently

1. Migrate one vertical slice end to end before anything else
2. Write contract tests against the old API first
3. Plan the data migration as its own project

Read more in the [Spring Boot reference documentation](https://docs.spring.io/spring-boot/).
