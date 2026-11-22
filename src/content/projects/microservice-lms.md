---
title: Microservice LMS
description: The start of a learning management system built as Spring Boot microservices, talking to each other over gRPC and Kafka. Unfinished, but the hard plumbing works end to end.
date: 2025-12-01
stack: [Java, Spring Boot, gRPC, Protocol Buffers, Apache Kafka, PostgreSQL, Docker]
repo: https://github.com/ABaulderstone/microservice-lms
---

## Why build it

I rarely get to work with microservices, so this was a chance to explore them properly. I had two more specific reasons too. I'd worked with gRPC a little on a confidential project and thought it was super cool, so I wanted to understand it better. And I needed to learn Kafka well enough to help a student who was using it.

For the domain I picked a learning management system. I've used plenty of them as an educator and always thought I could do better, and knowing the domain well meant I could spend my energy on the new tech. For the same reason, I built every service in Spring Boot, which I already know well.

## The services

So far there are three services, all in Docker Compose:

- **API gateway:** a normal REST API for a frontend. It handles authentication with Spring Security and JWTs, and calls the auth service over gRPC.
- **Auth service:** users, roles and issuing JWTs.
- **Profile service:** each user's personal details. It has its own gRPC API, though the gateway doesn't call it yet.

Each service has its own database, and the services never read each other's data directly. Kafka runs in KRaft mode, so there's no ZooKeeper to manage, with Kafka UI alongside it for checking topics and messages.

## gRPC and Protocol Buffers

The services talk to each other in gRPC, defined in shared `.proto` files. Each service's Maven build compiles those files into Java classes, both in the IDE and inside each service's Docker build.

The gateway checks the JWT once, then passes the user's ID and roles on to the other services as gRPC metadata. An interceptor on the gateway attaches that metadata to every call, and one in the auth service reads it. This avoids a second layer of service-to-service tokens, and it means I can test any service directly with Postman during development. On the way back, the gateway turns gRPC status codes into HTTP ones, so a `NOT_FOUND` from a service becomes a 404 for the client.

## Kafka and events

Creating a user shows the event-driven side. The gateway calls the auth service over gRPC, the auth service saves the user and publishes a `UserCreated` event, and the profile service picks it up and creates an empty profile. The event itself is a Protocol Buffers message too:

```protobuf
message UserCreated {
    int64 user_id = 1;
    int64 occurred_at = 2;
}
```

It's published to a versioned topic, `user.created.v1`, keyed by the user's ID. Creating the profile is safe to repeat, so processing the same event twice does no harm. Getting the producer and consumer talking took a few days of debugging Kafka's listener configuration, which taught me more than any tutorial would have.

## Spring Security

Spring Security assumes server-rendered pages with sessions, so a stateless JSON API takes some work. I wrote my own handlers for 401 and 403 responses so every error has the same JSON shape, and a `@RequireRoles` annotation that reads more clearly than the built-in options. The README documents the gotchas I hit, mainly as notes for my future self.

## What's next

It's unfinished. Next up is a cohort service for classes, enrolments and schedules, then email, notification and integration services (GitHub, Zoom, Microsoft Forms). Testing is planned rather than written: Playwright tests against the whole running system, and JUnit and Mockito for the business logic.
