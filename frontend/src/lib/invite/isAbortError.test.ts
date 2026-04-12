import { describe, expect, it } from 'vitest';
import { isAbortError } from './isAbortError';

describe('isAbortError', () => {
  it('detects DOMException AbortError', () => {
    const e = new DOMException('aborted', 'AbortError');
    expect(isAbortError(e)).toBe(true);
  });

  it('detects object with name AbortError', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
  });

  it('rejects other errors', () => {
    expect(isAbortError(new Error('no'))).toBe(false);
  });
});
