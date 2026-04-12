import { describe, expect, it, vi, afterEach } from 'vitest';
import { isLikelyMobileDevice } from './isLikelyMobileDevice';

describe('isLikelyMobileDevice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is true for iPhone UA', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    expect(isLikelyMobileDevice()).toBe(true);
  });

  it('is false for desktop UA', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    expect(isLikelyMobileDevice()).toBe(false);
  });
});
