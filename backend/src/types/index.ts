export type RoomMode = 'p2p' | 'sfu';

/** MVP: only `ephemeral` is allowed; `personal` is reserved for future authenticated users. */
export type RoomType = 'ephemeral' | 'personal';

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
  /** Always `ephemeral` for guest-created rooms in MVP. */
  roomType: RoomType;
  ownerUserId?: string;
  expiresAt?: number;
  participants: Map<string, ParticipantMeta>;
}
