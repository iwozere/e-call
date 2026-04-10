export type RoomMode = 'p2p' | 'sfu';

export interface ParticipantMeta {
  participantId: string;
  displayName: string;
  joinedAt: number;
  socketId?: string;
}

export interface RoomMeta {
  roomId: string;
  createdAt: number;
  mode: RoomMode;
  participants: Map<string, ParticipantMeta>;
}
