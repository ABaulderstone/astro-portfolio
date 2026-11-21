# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See also `AGENTS.md` (Astro's agent instructions and doc links), which applies here too.

## Commands

- `npx astro dev --background`: start the dev server in the background (localhost:4321). Manage it with `astro dev stop | status | logs`
- `npm run build`: production build to `dist/`
- `npm run preview`: serve the built site
- `npm test`: run the Vitest suite once (`npm run test:watch` to watch). Tests live next to the code as `src/**/*.test.ts` and render `.astro` components to HTML with Astro's container API (`astro/container`); `vitest.config.ts` uses `getViteConfig` so they get the Astro config.
- `npm run test:e2e`: Playwright browser tests in `e2e/` (desktop Chrome and a Pixel 7), run against a production build served on port 4322. They cover axe WCAG 2.2 AA checks on every page in `src/pages` in light and dark mode, the mobile menu, the theme toggle, the skip link and the panel line animation (including reduced motion). First run locally needs `npx playwright install chromium`. `.github/workflows/test.yml` runs both suites and the build on every PR and push to main.
- `npx astro check`: type-check `.astro`/TS files. There's no linter yet. (`@astrojs/check` isn't installed, so the first run will prompt to add it.)

Requires Node >= 22.23.4 (Astro 7).

## Architecture

A personal portfolio site (`https://alexbaulderstone.com`), built as a static Astro 7 site with Tailwind CSS v4.

- **Layout chain**: pages → `src/layouts/Frame.astro` (a viewport-inset `.frame` box with a thick `.frame-border` overlay that fills the screen; content always fits inside it, and anything taller will scroll within the frame rather than grow the page; styled in `global.css`; content sits in a centered `max-w-5xl` column. The frame and that column are flex columns that fill the frame's height, so a page can centre content vertically by wrapping it in a `flex-1` element, as the home page does) → `src/layouts/Base.astro` (the HTML shell). Pages pass `title` and `description` props down through `Frame`. `Base` uses them for `<title>`, the meta description and a canonical URL built from `Astro.site`. `Base` also adds the skip link and the `<main id="main">` wrapper, so pages shouldn't add their own `<main>`. `Frame` renders `src/components/SiteNav.astro` into `Base`'s named `header` slot, outside `<main>`. The frame insets are CSS variables on `:root` in `global.css`, so the nav and the frame stay aligned. On mobile the bottom inset is taller to leave room for the fixed menu button.
- **Icons**: one component per icon in `src/components/icons/` (`HomeIcon`, `MapPinIcon`, ...), each wrapping the shared `Icon.astro` base: a 24px grid, 2.5 stroke in `currentColor`, `aria-hidden`, `size-7` unless you pass `class` (which replaces it). Draw new icons in the same style rather than adding an icon library; `icons.test.ts` picks up any new `*Icon.astro` automatically.
- **Mobile nav**: the drawer uses the Popover API (`popover` / `popovertarget`) with CSS `@starting-style` transitions, so it needs no client JS.
- **Styling**: Tailwind v4 is set up through the Vite plugin, not `@astrojs/tailwind`, and there is no `tailwind.config.js`. All theme config lives in CSS in `src/styles/global.css` (`@theme` tokens such as `--color-brand`, `--font-sans` and `--font-heading`, plus `@plugin "@tailwindcss/typography"`). `Base.astro` is the only place that imports it. The `dark:` variant is redefined with `@custom-variant` in `global.css`: it follows `prefers-color-scheme` unless `<html data-theme="light|dark">` overrides it. `src/components/ThemeToggle.astro` (rendered by `Frame` in a `<footer>` that fills `Base`'s named `footer` slot after `<main>` and sits in the frame's bottom inset; the button starts `hidden` and its script reveals it, so it never appears without JS) sets that attribute and saves it to localStorage, and an inline script in `Base`'s `<head>` reapplies it before paint.
- **Fonts**: loaded with Astro's built-in Fonts API (`fonts` in `astro.config.mjs`, which self-hosts them from Google at build time and generates metric-matched fallbacks). `Base` renders a `<Font>` for each. Roboto is the body font (`--font-sans`); Press Start 2P is the heading font (`--font-heading`, applied to `h1`–`h6` in `global.css`).
- **Routing/SEO**: `trailingSlash: 'always'` is set in `astro.config.mjs`, so internal links need trailing slashes (`/about/`, not `/about`). `@astrojs/sitemap` generates the sitemap from `site`.

## Rules

- trailingSlash: 'always'; every page uses the Frame layout
- Accessibility: semantic HTML, visible focus, 4.5:1 text contrast, honour prefers-reduced-motion
- SEO: every page needs title, description, canonical URL
- Don't animate main content opacity (hurts LCP); animate the border only
- Zero client JS unless there's a clear reason
- Light mode accent: icons (menu, theme toggle etc.), links and headings are nebula (`nebula-600`), phosphor in dark mode; body text is grey: `paper-800` in light mode, `void-200` in dark mode
- Code will be pushed to feature branches named feature/{description}
  - Merges will happen on github, but prompt me if there are unmerged changes before switching to another branch
