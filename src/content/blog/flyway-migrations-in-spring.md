---
title: Using Flyway Migrations with Spring Boot
description: Explaining Flyway Migrations in a Java Spring Boot environment. What Flyway migrations are for, how they differ from ddl-auto, and how to install, write, seed and safely evolve a schema with expand, backfill, contract.
pubDate: 2026-09-10
tags: [Java, Spring Boot, Migrations, Flyway]
---

Flyway gives your database a version history that lives in Git next to your code, so every environment can be brought to exactly the same schema by running the same ordered scripts.

## The problem migrations solve

Every Spring Boot app has two things that must agree: your `@Entity` classes and the tables in your database. Likely, you have been taught to use ddl-auto to ensure they agree; your entity classes are **the source of truth** for your database. This is fine for solo developers, and early stage development. Adding or altering a field name in your class will **auto-magically** patch your database table. The real problems occur once you have production data, team members working on the same codebase, and different versions of your app all over the place.

Migrations fix this by treating schema changes like code changes. Each change is a small, numbered script, committed to the repo and reviewed in a pull request. On startup, Flyway:

1. Reads a table it manages called `flyway_schema_history` to see which scripts have already run against this database.
2. Scans the classpath for migration files.
3. Runs any pending scripts in version order.
4. Records each one with a checksum, so it can tell if a script has been edited after it ran.
   The result is that "what does the database look like?" has one answer: whatever the migrations in `main` say.

Throughout this post I'll use an example of a small library app with `Genre`, `Book`, `Member` and `Loan` entities on MySQL. Don't worry too much about the domain here - the concepts are the important thing.

## Migrations vs `ddl-auto`

`spring.jpa.hibernate.ddl-auto` lets Hibernate generate schema from your entities; migrations let you write the schema yourself.

| Value         | What Hibernate does on startup                         | Where it's reasonable               |
| ------------- | ------------------------------------------------------ | ----------------------------------- |
| `create-drop` | Builds the schema, drops it on shutdown                | Throwaway demos, some tests         |
| `create`      | Drops and rebuilds the schema every start              | Early prototyping only              |
| `update`      | Adds missing tables and columns                        | Personal experiments                |
| `validate`    | Changes nothing; fails if entities and tables disagree | Everywhere, alongside Flyway        |
| `none`        | Does nothing                                           | When something else owns the schema |

`update` is the tempting one, and it's the one that causes trouble:

- **It never removes anything.** Delete a field and the column stays forever, often still `NOT NULL`, so inserts start failing.
- **It can't rename.** Rename `firstName` to `givenName` and Hibernate sees a brand new column. The old one, with all your data, is orphaned.
- **It can't move data.** Splitting a column, changing a type or backfilling values is outside what it does.
- **There's no history.** Each database ends up in whatever state the last entity version left it, so dev, CI and prod drift apart.
- **Nobody reviews it.** The SQL that changes your production schema is generated at runtime and never appears in a pull request.
  The setup I recommend is that Flyway owns the schema and Hibernate only checks it:

```properties
spring.jpa.hibernate.ddl-auto=validate
```

Spring Boot runs Flyway before the JPA `EntityManagerFactory` starts, so `validate` checks the freshly migrated schema. If you change an entity and forget the migration, the app refuses to start with a clear error instead of failing in runtime at the the first insert.

If you don't set it, Spring Boot defaults `ddl-auto` to `create-drop` only for an embedded database with no schema manager. Once Flyway is on the classpath, the default is `none`. I'd still set `validate` explicitly.

## How this compares to other frameworks

If you've used Rails, Laravel or Django, migrations aren't new. Flyway's main difference is that it doesn't generate anything from your models: you write the SQL.

| Stack       | Tool                     | How a migration is written                  | Generated from models?                  | Rolling back                         | Seeding                            |
| ----------- | ------------------------ | ------------------------------------------- | --------------------------------------- | ------------------------------------ | ---------------------------------- |
| Rails       | Active Record Migrations | Ruby DSL (`change`, or `up`/`down`)         | Skeleton only; you add the columns      | `rails db:rollback`                  | `db/seeds.rb` and `rails db:seed`  |
| Laravel     | Laravel migrations       | PHP `up()`/`down()` with the Schema builder | Skeleton only                           | `php artisan migrate:rollback`       | Seeder classes and `db:seed`       |
| Django      | Built-in migrations      | Python operations                           | Yes, `makemigrations` diffs your models | Migrate back to an earlier migration | Fixtures, or data migrations       |
| .NET        | EF Core migrations       | C# `Up`/`Down`                              | Yes, `migrations add` diffs your model  | Update to an earlier migration       | `HasData` or seeding code          |
| Node        | Prisma Migrate           | SQL files                                   | Yes, diffs `schema.prisma`              | No down migrations; roll forward     | `prisma db seed` script            |
| Spring Boot | Flyway                   | Plain SQL (or Java)                         | No                                      | Forward only in the free edition     | Migrations, or a separate location |
| Spring Boot | Liquibase                | XML, YAML, JSON or SQL changelogs           | Via diff tooling                        | Built-in rollback                    | Changesets with contexts           |

- **Flyway is closest to Rails and Laravel in spirit.** Ordered, version-controlled files that run once each. The difference is plain SQL instead of a DSL, so what you review is exactly what runs.
- **There's no `makemigrations` step.** You are the diff tool. That's more typing, but you also never get a surprise `DROP COLUMN` from a generator that misread a rename.
- **Forward-only is a feature.** Down migrations look reassuring but rarely get tested, and you can't un-drop data anyway. With Flyway you fix mistakes with a new migration, the same way you'd fix code with a new commit.
- **Liquibase is the other main choice in Java.** It's more abstract and has rollback built in. Flyway wins on simplicity, which is why I teach it.

## Installing Flyway

You need two dependencies: one that wires Flyway into Spring Boot, and one that teaches Flyway your database. The first changed in Spring Boot 4.

**Spring Boot 4** split auto-configuration into modules, so `flyway-core` on its own no longer switches Flyway on. Add the starter ([Spring blog: Modularizing Spring Boot](https://spring.io/blog/2025/10/28/modularizing-spring-boot)):

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-flyway</artifactId>
</dependency>
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-mysql</artifactId>
</dependency>
```

**Spring Boot 3** auto-configures Flyway whenever its jar is present:

```xml
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-mysql</artifactId>
</dependency>
```

For PostgreSQL, swap `flyway-mysql` for `flyway-database-postgresql`. Spring Boot manages the versions, so leave them off. If you're starting fresh, ticking Flyway in Spring Initializr adds the right ones for you.

Then the config:

```properties
spring.jpa.hibernate.ddl-auto=validate

# These are the defaults; shown so you know they exist
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
```

Create `src/main/resources/db/migration`, add your first migration (next section) and start the app. You'll see a log line like `Successfully applied 1 migration to schema 'library'`, and a new table:

```sql
SELECT version, description, success FROM flyway_schema_history;
```

### Adding Flyway to an existing database

If the app already has a database built by `ddl-auto=update`, don't let Flyway try to create tables that already exist. Dump the current schema into `V1__baseline.sql` so fresh environments can build it, then tell Flyway to treat existing databases as already at version 1:

```properties
spring.flyway.baseline-on-migrate=true
```

On a database with tables but no history table, Flyway records a baseline at version 1 and only runs migrations after it. On an empty database it runs `V1` as normal.

## Writing migrations

A migration is a SQL file whose name tells Flyway when to run it: `V<version>__<description>.sql`, with **two** underscores.

```
src/main/resources/db/migration/
├── V1__create_library_tables.sql
├── V2__add_isbn_to_books.sql
└── R__member_loan_summary_view.sql
```

There are three prefixes:

| Prefix           | Runs                                                            | Use it for                                                          |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `V` (versioned)  | Once, in version order                                          | Almost everything: tables, columns, indexes, data changes           |
| `R` (repeatable) | After all versioned migrations, again whenever the file changes | Views, stored procedures, anything you'd rather redefine than alter |
| `U` (undo)       | On demand, to reverse a `V`                                     | Paid editions only; most teams skip it                              |

Versions can be `1`, `2`, `3`, or dotted like `1.1`. On a team where two people might both grab `V7` on the same day, a timestamp version such as `V20261122_1030__add_isbn_to_books.sql` avoids the collision.

Here's a first migration:

```sql
-- V1__create_library_tables.sql
CREATE TABLE genres (
  id   BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  CONSTRAINT uq_genres_name UNIQUE (name)
);

CREATE TABLE library_members (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  first_name   VARCHAR(100) NOT NULL,
  last_name    VARCHAR(100) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20)  NOT NULL,
  created_at   DATETIME(6)  NOT NULL,
  updated_at   DATETIME(6)  NOT NULL,
  CONSTRAINT uq_library_members_email UNIQUE (email),
  CONSTRAINT uq_library_members_phone_number UNIQUE (phone_number)
);
```

And a later change:

```sql
-- V2__add_isbn_to_books.sql
ALTER TABLE books ADD COLUMN isbn VARCHAR(13) NULL;
CREATE UNIQUE INDEX uq_books_isbn ON books (isbn);
```

With `ddl-auto=validate`, the day-to-day loop is:

1. Change the entity (add `private String isbn;` to `Book`).
2. Start the app. It fails validation, telling you exactly which column is missing.
3. Write the migration that adds it.
4. Start again. Flyway applies it, validation passes.

### Rules worth following

- **Never edit a migration that has run somewhere shared.** Flyway stores a checksum for every applied script and refuses to start if one changes. Fix mistakes with a new migration. (Editing one that has only run in your development environment is fine: reset your local database and go again.)
- **One logical change per file.** Small migrations are easier to review and to recover from when one fails.
- **Name your constraints.** `uq_library_members_email` is easy to drop in a later migration. A generated name like `UK6dotkott2kjsp8vw4d0m25fb7` is not.
- **Know your database's transactions.** PostgreSQL runs DDL inside a transaction, so a failed migration rolls back cleanly. MySQL commits each DDL statement immediately, so a migration that fails halfway leaves the first half applied. Fix the database by hand, then run `flyway repair` to clear the failed entry from the history table.
- **Keep `clean` away from production.** `flyway clean` drops everything. It's disabled by default; leave it that way outside local dev.

## SQL vs Java migrations

Write migrations in SQL by default, and reach for Java only when the change needs logic SQL can't express cleanly.

They live in different source folders but end up in the same place:

```
src/main/resources/db/migration/   <- SQL files
    V1__create_library_tables.sql
    V2__add_isbn_to_books.sql
src/main/java/db/migration/        <- Java classes, package db.migration
    V3__Normalise_member_phone_numbers.java
```

After compilation, both sit on the classpath under `db/migration`, which is Flyway's default location. They share one version sequence, so `V3` can be a Java class and `V4` a SQL file. Flyway doesn't care, as long as no two migrations claim the same version.

A Java migration extends `BaseJavaMigration`, and its class name follows the same naming rule:

```java
package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V3__Normalise_member_phone_numbers extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        var connection = context.getConnection();
        try (var select = connection.createStatement();
             var rows = select.executeQuery("SELECT id, phone_number FROM library_members");
             var update = connection.prepareStatement(
                 "UPDATE library_members SET phone_number = ? WHERE id = ?")) {

            while (rows.next()) {
                update.setString(1, toE164(rows.getString("phone_number")));
                update.setLong(2, rows.getLong("id"));
                update.addBatch();
            }
            update.executeBatch();
        }
    }

    // "0412 345 678" -> "+61412345678"
    private static String toE164(String raw) {
        String digits = raw.replaceAll("\\D", "");
        return digits.startsWith("0") ? "+61" + digits.substring(1) : "+" + digits;
    }
}
```

|             | SQL migrations                                               | Java migrations                                                            |
| ----------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Best for    | Schema changes, set-based data updates                       | Row-by-row logic, parsing, calling a library, hashing or encrypting values |
| Readability | Anyone (including a DBA) can read and run it in a SQL client | Needs a Java reader and a build                                            |
| Review      | The diff is exactly what runs                                | You review code that produces SQL                                          |
| Large data  | One big statement, one big lock                              | Easy to batch, commit in chunks and log progress                           |

One gotcha to look out for: **don't use your entities or Spring Data repositories inside a Java migration.** A migration has to behave the same way forever, but your entities keep changing. If `Member` loses `firstName`, a migration that used it will stop compiling, or worse, quietly do something different on the next fresh database. Stick to plain JDBC through `context.getConnection()`.

Spring Boot also picks up any `JavaMigration` beans you register, which lets you inject things. Use it sparingly, for the same reason.

## Seeding data with migrations

Split seed data into two kinds: data the app needs in every environment, and sample data that only belongs on a developer's machine.

**Reference data** is part of the schema in all but name. Genres, roles like `ADMIN`, `STAFF` and `MEMBER`, loan statuses. The app is broken without them, so they go in a normal versioned migration:

```sql
-- V4__seed_genres.sql
INSERT INTO genres (name) VALUES
  ('Fiction'), ('Non-fiction'), ('Science Fiction'), ('Biography'), ('Children');
```

**Sample data** (fake members, a few hundred books, some overdue loans) must never reach production. Keep it in its own folder and only add that folder for the `dev` profile:
**IMPORTANT - SET THE SEED PATH IN DEV MODE**

```properties
# application-dev.properties
spring.flyway.locations=classpath:db/migration,classpath:db/seed
```

```
src/main/resources/db/
├── migration/                   <- every environment
└── seed/                        <- dev only
    └── R__dev_sample_data.sql
```

I make dev seeds **repeatable** (`R__`) rather than versioned, for three reasons:

- Repeatable migrations run after all versioned ones, so the seed always sees the latest schema.
- When a schema change breaks the seed, you're allowed to edit it. It simply re-runs on the next start.
- Versioned seeds in a second folder can collide with real migration numbers, and that collision only shows up in dev.
  Because a repeatable script re-runs whenever it changes, write it so running it twice is harmless:

```sql
-- R__dev_sample_data.sql (dev only)
DELETE FROM loans;
DELETE FROM books;
DELETE FROM library_members;

INSERT INTO library_members
  (first_name, last_name, email, phone_number, created_at, updated_at)
VALUES
  ('Ada',  'Lovelace', 'ada@example.com',  '+61400000001', NOW(6), NOW(6)),
  ('Alan', 'Turing',   'alan@example.com', '+61400000002', NOW(6), NOW(6));
```

If your seeds start needing a lot of logic, you could always use a

- **command line runner for complex seeding** if you're using logic or validations for your seeded dev data, consider a command line runner which will run **after** your migrations.
- **No real credentials in migrations.** An admin user with a password hash in Git is a password in Git. Create the first admin from an environment variable at startup instead.
- **Tests get their own data.** Your Testcontainers or `@DataJpaTest` setup runs the real migrations. Load per-test data with `@Sql` or the test's own setup, so tests don't depend on the dev seed.

## Expand, backfill, contract

When a schema change would break the version of the app that's currently running, split it into small steps so old and new code can share the database safely.

This matters as soon as you deploy without downtime. During a rolling deploy, the old version and the new version run side by side against the same database for a few minutes. If release 2 renames a column in one migration, every release 1 instance still serving traffic starts throwing errors. You also lose the ability to roll the app back, because the old code no longer matches the schema.

Take a real example: replacing `first_name` and `last_name` on `library_members` with a single `full_name`. Each release keeps the previous app version working:

| Release | Step         | Schema change                            | Code change                              |
| ------- | ------------ | ---------------------------------------- | ---------------------------------------- |
| 1       | Expand       | Add nullable `full_name`                 | Write all three columns, read first/last |
| 2       | Backfill     | Batch-fill `full_name` for existing rows | Read `full_name`, still write all three  |
| 3       | Stop writing | Make `first_name`, `last_name` nullable  | Map only `full_name`                     |
| 4       | Contract     | Drop old columns, `full_name` `NOT NULL` | Unchanged                                |

Only release 4 can't be undone, so it ships last, once nothing reads or writes the old columns.

### 1. Expand

Add the new column without touching the old ones. It must be nullable, because existing rows have no value yet.

```sql
-- V6__add_full_name_to_library_members.sql
ALTER TABLE library_members ADD COLUMN full_name VARCHAR(201) NULL;
```

The entity maps all three fields, and every save writes both shapes:

```java
@PrePersist
@PreUpdate
void syncFullName() {
    this.fullName = firstName + " " + lastName;
}
```

### 2. Backfill

Fill in `full_name` for rows that existed before release 1. On a small table one `UPDATE` is fine. On a big one, a single statement locks a lot of rows for a long time, so batch it in a Java migration:

```java
package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V7__Backfill_member_full_name extends BaseJavaMigration {

    private static final int BATCH_SIZE = 1_000;

    @Override
    public void migrate(Context context) throws Exception {
        try (var stmt = context.getConnection().prepareStatement(
                "UPDATE library_members " +
                "SET full_name = CONCAT_WS(' ', first_name, last_name) " +
                "WHERE full_name IS NULL LIMIT ?")) {
            stmt.setInt(1, BATCH_SIZE);
            int updated;
            do {
                updated = stmt.executeUpdate();
            } while (updated > 0);
        }
    }

    // Commit each batch separately instead of one giant transaction
    @Override
    public boolean canExecuteInTransaction() {
        return false;
    }
}
```

The `WHERE full_name IS NULL` makes it safe to re-run if it fails partway. In the same release, switch reads over to `fullName` but keep writing all three columns. If you need to roll back to release 1, its data is still complete.

### 3. Stop writing

Remove `firstName` and `lastName` from the entity. The old columns are probably `NOT NULL`, which would make every new insert fail, so relax them first:

```sql
-- V8__relax_old_member_name_columns.sql
ALTER TABLE library_members
  MODIFY first_name VARCHAR(100) NULL,
  MODIFY last_name  VARCHAR(100) NULL;
```

### 4. Contract

Once release 3 is everywhere and you're confident you won't roll back past it, remove the old columns and tighten the new one:

```sql
-- V9__contract_member_name_columns.sql
ALTER TABLE library_members
  MODIFY full_name VARCHAR(201) NOT NULL,
  DROP COLUMN first_name,
  DROP COLUMN last_name;
```

Four releases for a rename feels like a lot. If you run a single instance and can accept a few seconds of downtime, you can collapse it into one release. The pattern earns its keep when old and new code overlap, and that's the normal case for most production systems.

## Wrapping up

Flyway turns your database schema into something you can review, reproduce and reason about, the same as the rest of your code. The checklist I give every new project:

- [ ] Starter (Boot 4) or `flyway-core` (Boot 3), plus your database module
- [ ] `spring.jpa.hibernate.ddl-auto=validate`
- [ ] SQL migrations in `db/migration`, Java only when you need logic
- [ ] Never edit a migration that has left your laptop
- [ ] Reference data in versioned migrations; dev sample data in a profile-only `R__` script
- [ ] Breaking changes split into expand, backfill and contract across releases
