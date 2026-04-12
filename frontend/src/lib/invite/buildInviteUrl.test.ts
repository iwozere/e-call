import { describe, expect, it } from 'vitest';
import { buildInviteUrl } from './buildInviteUrl';

describe('buildInviteUrl', () => {
  it('builds path with encoded room id', () => {
    expect(buildInviteUrl('abc/xyz', 'https://example.com')).toBe(
      'https://example.com/room/abc%2Fxyz'
    );
  });

  it('uses provided origin', () => {
    expect(buildInviteUrl('room1', 'http://localhost:5173')).toBe(
      'http://localhost:5173/room/room1'
    );
  });
});
