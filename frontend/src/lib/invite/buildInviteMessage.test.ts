import { describe, expect, it } from 'vitest';
import { buildInviteMessage } from './buildInviteMessage';

describe('buildInviteMessage', () => {
  it('default variant includes room code label', () => {
    const s = buildInviteMessage({
      inviteUrl: 'https://x.test/r',
      roomCode: 'ABC',
      variant: 'default',
    });
    expect(s).toContain('https://x.test/r');
    expect(s).toContain('Room code: ABC');
  });

  it('sms variant', () => {
    const s = buildInviteMessage({
      inviteUrl: 'https://x.test/r',
      roomCode: 'ABC',
      variant: 'sms',
    });
    expect(s).toContain('Join my video call:');
    expect(s).toContain('Room code: ABC');
  });

  it('email variant', () => {
    const s = buildInviteMessage({
      inviteUrl: 'https://x.test/r',
      roomCode: 'ABC',
      variant: 'email',
    });
    expect(s).toContain('A video room is ready.');
    expect(s).toContain('Join here:');
  });
});
