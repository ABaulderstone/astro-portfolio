---
title: Learning to loosen the reins - my experience with Claude Code
description: A post on my first experience with Claude Code and how I wrestled with the discomfort of letting go of control in my coding
pubDate: 2026-11-22
tags: [Claude Code, Agentic AI, Development, Astro]
---

If you listen to people (or their agents) on LinkedIn you're probably used to being told several times a day something along the lines of **"If you're not using agents you're being left behind**. I've also seen a huge increase in Agentic AI and Claude Code specifically in Job Descriptions recently.

## Biting the bullet

I have on more than one occasion been described as a "control freak". It's not a completely unfair accusation; I've often struggled with automation. There's something deeply unsettling to me about relinquishing control, particularly in areas where my expertise was hard won. But, after coaching a junior I've been mentoring for a job interview that was entirely geared around agentic coding, I felt out of my depth.

I'd been playing with the idea of building a personal website using Static Site Generation for a while: it was something I was constantly pitching to my students whenever they suggested rebuilding their portfolios in React ( _"that's like swatting a fly with a bazooka"_ I'd say to much chagrin); in a previous life I'd worked on Jekyll for the blog portion of our company website; a friend had been doing some really cool work with Gatsby for a start up. So I decided to kill two birds with one stone and build the [Astro](https://astro.build/) site I'd been thinking about

## The highest level programming language

I used to teach Ruby (and I still teach JavaScript) and I'd always talk about it's charm, and "human like syntax"; this would often prompt a discussion about low level vs high level programming, and I would joke "the next programming language will probably just be English". Who knew how prophetic I was being? Of course I've used LLMs plenty over the last couple of years, but mostly as either a synthesis of documentation, or in a socratic questioning kind of way for understanding. This was my first experience with **giving instructions for building**, and it became apparently pretty quickly that the better my instruction, the better my result.

Before learning to code, I studied linguistics and I used to joke that it was an antiquated, abstruse, pursuit of knowledge that I'd "never make any money from". Although I do think my knowledge of semantics, pragmatics, and syntax made me a better programmer; it has never felt as important as when I was writing prompts for this website.

## Finding a rhythm

There's no question that using agentic AI massively increases velocity, but I was still sitting with quite a bit of discomfort. In particular I really struggled to feel any ownership over the code. Sure I was guiding -- sometimes manually adjusting -- and sure it was my vision described, and sure I picked the stack and set some early rules about styling conventions etc. But I couldn't shake the feeling that I was just watching some magic unfold.

In a piece of incredible luck, early into the process I caught up with an old colleague of mine who has been working in a very agentic forward team. She was extremely generous with her time, and talked me through some of the strategies her team use. The crux of it was not too different to how any agile team works: splitting the work into small manageable tickets; code review; plenty of integration testing.

After that conversation I made some changes. Firstly I set up CI with playwright and axe (especially important given the purpose of this site), then I added several rules to
`CLAUDE.md` particularly around git branching, testing, and making PRs
Then I shifted into a work flow that helped me feel much more in control of the process:

1. Use plan mode to define the scope of a piece of work
2. Switch to a feature branch and implement changes
3. Run all e2e tests - use screenshots where required
4. Push a PR with summary of changes
5. Let me manually review the PR

It might just be the **illusion** of control here; but I feel more like a senior dev guiding a particularly clever junior who surprises me with cool new ways of doing things all the time

## Final thoughts

I'm still uneasy. I fear becoming irrelevant more than ever. I don't like how much code is in this site that I don't completely understand. I definitely miss the pure, unadulterated joy of creating something cool on my own. But on the other hand I can't deny the velocity, the quality of the output, and the convenience of working this way. Rather than fiddling with CSS, I'm writing a blog post. By hand of course, the other allegedly useless degree I have is English Literature.
