import type { InviteMessageInput } from './types';

export function buildInviteMessage(input: InviteMessageInput): string {
  const { inviteUrl, roomCode, variant = 'default' } = input;
  if (variant === 'sms') {
    return `Join my video call: ${inviteUrl}\nRoom code: ${roomCode}`;
  }
  if (variant === 'email') {
    return `A video room is ready.\n\nJoin here: ${inviteUrl}\nRoom code: ${roomCode}`;
  }
  return `Join my video call: ${inviteUrl}\nRoom code: ${roomCode}`;
}
