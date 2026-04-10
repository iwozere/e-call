export type RoomMode = 'p2p' | 'sfu';

export interface RoomInfo {
  roomId: string;
  exists: true;
  mode: RoomMode;
  participantCount: number;
}

export interface CreateRoomResponse {
  roomId: string;
  mode: RoomMode;
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
