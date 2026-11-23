---
title: This portfolio
description: My portfolio site, a static Astro site with almost no client JS, built with Claude Code. It's hosted on AWS with Terraform, the contact form is serverless, and every merge is tested and deployed by GitHub Actions.
date: 2026-11-22
stack:
  [
    Astro,
    TypeScript,
    Tailwind CSS,
    AWS Lambda,
    DynamoDB,
    SES,
    S3,
    CloudFront,
    Terraform,
    Vitest,
    Playwright,
    axe,
    GitHub Actions,
    Claude Code,
  ]
repo: https://github.com/ABaulderstone/astro-portfolio
url: https://alexbaulderstone.com/
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

## Hosting and deployment

The site is just a folder of static files, so it lives in a private S3 bucket behind CloudFront. Everything in AWS is defined in Terraform: the bucket, the distribution and its certificate, the DNS records, the contact form's backend, and the role GitHub deploys with.

Every URL here ends in a slash (`/about/`), but a private S3 bucket only serves `index.html` at the root. A small CloudFront Function adds it to each path, adds the slash when it's missing, and redirects `www` to the bare domain.

When a pull request merges, GitHub Actions runs the unit and browser tests again, then builds the site, uploads it to S3, clears CloudFront's cache and updates the contact form's Lambda. GitHub signs in to AWS with OIDC, so there are no AWS keys sitting in the repo's secrets, and the role it gets can only do those few things.

## The contact form

The form is a plain HTML POST to an AWS Lambda. I wrote the handler before the Lambda existed, and it takes "somewhere to store enquiries" and "a way to send email" as arguments. In development those write to a JSON file and an outbox folder. In production they're DynamoDB and SES.

Each enquiry is stored, then SES emails me and sends the person a short acknowledgement. A hidden honeypot field catches most bots, and the whole setup costs well under a dollar a month.
