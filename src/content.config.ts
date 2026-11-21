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

export const collections = { career };
