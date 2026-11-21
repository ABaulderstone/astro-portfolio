import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Work history for the career page: one Markdown file per job, the body being what I did there.
// Leave out `end` for a current job.
const career = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/career' }),
  schema: z.object({
    company: z.string(),
    role: z.string(),
    start: z.coerce.date(),
    end: z.coerce.date().optional(),
    location: z.string().optional(),
    stack: z.array(z.string()),
  }),
});

export const collections = { career };
