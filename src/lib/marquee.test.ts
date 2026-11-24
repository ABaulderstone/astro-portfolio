import { describe, expect, it } from 'vitest';
import { stackMarquee, textMarquee } from './marquee';

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

describe('textMarquee', () => {
  it('keeps a line that fits still', () => {
    expect(textMarquee('Short line').scrolls).toBe(false);
  });

  it('scrolls a line too wide for the panel, at about 40px a second', () => {
    // 50 characters at 8px: 400px
    expect(textMarquee('x'.repeat(50))).toEqual({ scrolls: true, duration: '10s' });
  });
});
