import { describe, expect, it } from 'vitest';
import { formatRoomCode } from './formatRoomCode';

describe('formatRoomCode', () => {
  it('uppercases trimmed id', () => {
    expect(formatRoomCode('  ab12  ')).toBe('AB12');
  });
});
