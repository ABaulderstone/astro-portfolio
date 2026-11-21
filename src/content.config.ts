import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Work history for the career page: one file per company, listing the roles held there newest
// first. Leave out a role's `end` while it's current.
const career = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/career' }),
  schema: z.object({
    company: z.string(),
    stack: z.array(z.string()),
    roles: z
      .array(
        z.object({
          title: z.string(),
          start: z.coerce.date(),
          end: z.coerce.date().optional(),
          summary: z.string().optional(),
          highlights: z.array(z.string()),
        }),
      )
      .min(1),
  }),
});

// Blog posts: one Markdown file per post, its file name being the URL slug (/blog/<slug>/).
// Drafts show in dev but are left out of the build.
const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Projects: one Markdown file per project, its file name being the URL slug (/projects/<slug>/),
// newest first by `date`, linking to its GitHub `repo` and, if it has one, its deployed `url`. Drafts show in dev
// but are left out of the build.
const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    stack: z.array(z.string()).min(1),
    repo: z.url(),
    url: z.url().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { career, blog, projects };
