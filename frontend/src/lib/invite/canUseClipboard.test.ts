import { describe, expect, it, vi, afterEach } from 'vitest';
import { canUseClipboard } from './canUseClipboard';

describe('canUseClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false without clipboard API', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', { isSecureContext: true });
    expect(canUseClipboard()).toBe(false);
  });

  it('is false in insecure context', () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: async () => {} } });
    vi.stubGlobal('window', { isSecureContext: false });
    expect(canUseClipboard()).toBe(false);
  });

  it('is true with clipboard.writeText in secure context', () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: async () => {} } });
    vi.stubGlobal('window', { isSecureContext: true });
    expect(canUseClipboard()).toBe(true);
  });
});
