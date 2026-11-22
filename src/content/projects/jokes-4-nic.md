---
title: Jokes 4 Nic
description: A one-button React app that fetches a random dad joke. Built in an afternoon as a lesson on deploying to Netlify, revision on fetch for my students, and a gift for someone who loved cheesy jokes.
date: 2023-07-01
stack: [React, JavaScript, Vite, Netlify]
repo: https://github.com/ABaulderstone/jokes-4-nic
url: https://jokes-4-nic.netlify.app
---

## Why build it

It's the smallest project here, and it did three jobs at once:

- **A lesson on deployment.** I needed to quickly show my students how to deploy a React app to Netlify, and a lesson goes better with something real to deploy.
- **Revision on fetch.** My students were learning to call APIs, so the app's one feature was a chance to go over `fetch` again.
- **A gift.** My partner at the time loved cheesy jokes, so I made them a site that serves one at the press of a button.

## How it works

There's one button. Press it and the app asks [icanhazdadjoke](https://icanhazdadjoke.com/) for a random joke and shows it:

```js
const getJoke = async () => {
  const response = await fetch('https://icanhazdadjoke.com/', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to get joke');
  }
  const data = await response.json();
  return data.joke;
};
```

Small as it is, it covers two things students often trip over. Without the `Accept` header, icanhazdadjoke sends the joke back as plain text, so `response.json()` fails. And `fetch` doesn't throw when a request fails with an error status like 404 or 500, so you have to check `response.ok` yourself.

## Deploying it

It's a Vite app, so Netlify only needs two things: the build command (`npm run build`) and the folder it writes to (`dist`). From there you can connect the repo so every push redeploys the site, or drag the built folder straight into Netlify. Both are about a minute's work, which made it a good one to show a class.
