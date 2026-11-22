import { describe, expect, it } from 'vitest';
import { stackMarquee } from './marquee';

describe('stackMarquee', () => {
  it('keeps a stack that fits one row still', () => {
    expect(stackMarquee(['React', 'Redux', 'Redux-Observable']).scrolls).toBe(false);
  });

  it('scrolls a stack too wide for one row, at about 40px a second', () => {
    const stack = ['React', 'Redux', 'Redux-Observable', 'AWS Lambda', 'Api Gateway', 'Node.js'];
    // 54 characters at 7px plus 6 chips at 28px: 546px
    expect(stackMarquee(stack)).toEqual({ scrolls: true, duration: '14s' });
  });
});
