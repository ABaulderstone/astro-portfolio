---
# Placeholder post: replace with a real one
title: Teaching testing to junior developers
description: Placeholder post on how I introduce automated testing to new developers, from the first unit test to React Testing Library and REST Assured.
pubDate: 2026-08-22
tags: [Testing, Mentoring]
---

This is a placeholder post about teaching testing. Replace it with a real one.

## Start with the why

Juniors often see tests as extra work. A short paragraph on showing them how tests make change safe instead.

## A first React test

Keep the first test small and focused on what the user sees:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

test('increments when clicked', async () => {
  render(<Counter />);
  await userEvent.click(screen.getByRole('button', { name: /add/i }));
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

## What sticks

| Habit | Why it matters |
| --- | --- |
| Test behaviour, not implementation | Refactors don't break tests |
| One reason to fail per test | Failures point at the problem |
| Run tests before pushing | Broken builds stay rare |

Use `npm test -- --watch` while you work, and the feedback loop does the teaching.
