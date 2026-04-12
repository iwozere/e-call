export interface InviteData {
  roomId: string;
  roomCode: string;
  inviteUrl: string;
  roomMode: 'p2p' | 'sfu';
}

export interface InviteMessageInput {
  inviteUrl: string;
  roomCode: string;
  variant?: 'default' | 'sms' | 'email';
}
