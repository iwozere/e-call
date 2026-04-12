import { describe, expect, it, vi, afterEach } from 'vitest';
import { canShare } from './canShare';

describe('canShare', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false when navigator.share is missing', () => {
    vi.stubGlobal('navigator', { share: undefined });
    expect(canShare()).toBe(false);
  });

  it('is true when navigator.share is a function', () => {
    vi.stubGlobal('navigator', { share: () => Promise.resolve() });
    expect(canShare()).toBe(true);
  });
});
