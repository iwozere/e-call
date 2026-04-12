import { describe, expect, it } from 'vitest';
import { buildSmsLink } from './buildSmsLink';

describe('buildSmsLink', () => {
  it('encodes body and uses sms scheme', () => {
    const href = buildSmsLink('hello & bye');
    expect(href.startsWith('sms:?&body=')).toBe(true);
    expect(decodeURIComponent(href.slice('sms:?&body='.length))).toBe('hello & bye');
  });
});
