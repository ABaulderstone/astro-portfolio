---
title: This portfolio
description: My portfolio site, a static Astro site with a pixel-art frame and almost no client JS, built with Claude Code and tested in CI for accessibility, SEO and layout on every page.
date: 2026-11-22
stack:
  [
    Astro,
    TypeScript,
    Tailwind CSS,
    Vitest,
    Playwright,
    axe,
    GitHub Actions,
    Claude Code,
  ]
repo: https://github.com/ABaulderstone/astro-portfolio
url: https://alexbaulderstone.com
---

## Why build it

I needed a new portfolio, and I had a second reason too. Agentic coding has gone from a novelty to something that turns up in job descriptions, and I wanted to properly learn it rather than skim it. So this site does double duty: it's the portfolio, and it's the project I learnt Claude Code on. I've written about that side of it, and how uncomfortable it was at first, in [Learning to loosen the reins](/blog/building-with-claude-code/).

## Why Astro

For years I've told students that rebuilding a portfolio in React is overkill. A portfolio is mostly content, and static site generation is the right tool for that, so it was time to take my own advice. Astro builds every page to plain HTML at build time. Blog posts, projects and career history are Markdown files in typed content collections, and a page only ships JavaScript if I ask it to.

Almost everything interactive here is HTML and CSS:

- the mobile menu uses the Popover API
- the career timeline keeps the selected job in the URL hash and uses `:target` to show it
- the starfield on the home page is layered SVG masks
- the contact form is a plain POST, validated by the browser

The only script on the site is the theme toggle. Here's the kind of CSS the career page generates for each job:

```css
/* Show a job's details when its timeline link puts it in the URL (/career/#coder-academy) */
.career:has(#coder-academy:target) [data-job='coder-academy'] {
  display: block;
}
```

Astro has made static sites feel modern again, and I expect to reach for it a lot more.

## Accessibility and SEO

Accessibility and SEO are a big focus for me at the moment, so I wanted them checked by machines rather than left to my memory. Every pull request runs Playwright against a production build:

- axe checks every page against WCAG 2.2 AA, in light and dark mode, on desktop and on a phone
- every page has to fit the screen with no page scroll, at five desktop sizes and on the phone
- the skip link, mobile menu and theme toggle are tested, including reaching the skip link with Tab and closing the menu with Escape
- animations are tested again with reduced motion turned on

Those tests have been so useful. When I wrote my first real blog posts, axe caught a checklist whose checkboxes had no labels, and a code theme whose comments were too faint to read in dark mode.

On the SEO side, every page has a title, a meta description and a canonical URL. Posts add Open Graph tags and `BlogPosting` structured data. There's a sitemap and an RSS feed, and pages that shouldn't be found, like the contact form's thank-you page, are kept out of both search results and the sitemap.

## How it works

Every page sits inside one frame that's exactly one screen tall. Rather than the page scrolling, each page divides the frame into panels and rearranges them for the screen size, with the panel lines drawing in when the page loads. Headings use Press Start 2P, a pixel font drawn on an 8px grid, so it's only ever used at multiples of 8px to keep it crisp.

## What's next

The contact form currently posts to a small dev server that saves enquiries locally. The plan is to replace it with an AWS Lambda that stores each enquiry, emails the person who got in touch and emails me. The form won't need to change: it only needs a new URL.
