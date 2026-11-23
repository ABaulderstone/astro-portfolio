/// <reference types="vitest/config" />
// getViteConfig applies astro.config.mjs, so tests can import .astro components and render them
// with the container API (astro/container).
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'functions/**/*.test.ts', 'infra/**/*.test.ts'],
  },
});
