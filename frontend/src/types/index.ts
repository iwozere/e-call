export type RoomMode = 'p2p' | 'sfu';

/** Present when API returns it; MVP uses ephemeral guest rooms only. */
export type RoomType = 'ephemeral' | 'personal';

export interface RoomInfo {
  roomId: string;
  exists: true;
  mode: RoomMode;
  roomType?: RoomType;
  participantCount: number;
}

export interface CreateRoomResponse {
  roomId: string;
  mode: RoomMode;
  roomType?: RoomType;
  inviteUrl: string;
}

export interface JoinTokenResponse {
  roomId: string;
  participantId: string;
  displayName: string;
  livekitUrl?: string;
  token?: string;
}

export interface ParticipantSummary {
  participantId: string;
  displayName: string;
  joinedAt: number;
  socketId?: string;
}
