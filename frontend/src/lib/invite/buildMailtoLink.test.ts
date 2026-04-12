import { describe, expect, it } from 'vitest';
import { buildMailtoLink } from './buildMailtoLink';

describe('buildMailtoLink', () => {
  it('encodes subject and body', () => {
    const href = buildMailtoLink('S & T', 'line1\nline2');
    expect(href.startsWith('mailto:?')).toBe(true);
    const params = new URLSearchParams(href.slice('mailto:?'.length));
    expect(params.get('subject')).toBe('S & T');
    expect(params.get('body')).toBe('line1\nline2');
  });
});
