# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See also `AGENTS.md` (Astro's agent instructions and doc links), which applies here too.

## Commands

- `npx astro dev --background`: start the dev server in the background (localhost:4321). Manage it with `astro dev stop | status | logs`
- `npm run build`: production build to `dist/`
- `npm run preview`: serve the built site
- `npx astro check`: type-check `.astro`/TS files. This is the only verification step; there are no tests or linter yet. (`@astrojs/check` isn't installed, so the first run will prompt to add it.)

Requires Node >= 22.23.4 (Astro 7).

## Architecture

A personal portfolio site (`https://alexbaulderstone.com`), built as a static Astro 7 site with Tailwind CSS v4.

- **Layout chain**: pages → `src/layouts/Frame.astro` (a viewport-inset `.frame` box with a thick `.frame-border` overlay, styled in `global.css`; content sits in a centered `max-w-5xl` column) → `src/layouts/Base.astro` (the HTML shell). Pages pass `title` and `description` props down through `Frame`. `Base` uses them for `<title>`, the meta description and a canonical URL built from `Astro.site`. `Base` also adds the skip link and the `<main id="main">` wrapper, so pages shouldn't add their own `<main>`.
- **Styling**: Tailwind v4 is set up through the Vite plugin, not `@astrojs/tailwind`, and there is no `tailwind.config.js`. All theme config lives in CSS in `src/styles/global.css` (`@theme` tokens such as `--color-brand` and `--font-sans`, plus `@plugin "@tailwindcss/typography"`). `Base.astro` is the only place that imports it. Dark mode uses Tailwind's default `dark:` variant, which follows `prefers-color-scheme`.
- **Routing/SEO**: `trailingSlash: 'always'` is set in `astro.config.mjs`, so internal links need trailing slashes (`/about/`, not `/about`). `@astrojs/sitemap` generates the sitemap from `site`.

## Rules

- trailingSlash: 'always'; every page uses the Frame layout
- Accessibility: semantic HTML, visible focus, 4.5:1 text contrast, honour prefers-reduced-motion
- SEO: every page needs title, description, canonical URL
- Don't animate main content opacity (hurts LCP); animate the border only
- Zero client JS unless there's a clear reason

## Known gaps

- The `Inter` font is referenced in `--font-sans` but nothing loads it.
