import type { RoomType } from '../types/index.js';

export type AuditOutcome = 'success' | 'failure' | 'denied' | 'error';

export type AuditActorType = 'guest' | 'user' | 'system' | 'admin';

/**
 * Structured audit event for security and incident response.
 * Do not attach raw tokens, SDP, or other secrets to metadata.
 */
export interface AuditEvent {
  eventId: string;
  timestamp: string;
  eventType: string;
  outcome: AuditOutcome;
  actorType: AuditActorType;
  actorId?: string;
  roomId?: string;
  roomMode?: 'p2p' | 'sfu';
  roomType?: RoomType;
  requestId?: string;
  sessionId?: string;
  sourceIpHash?: string;
  userAgent?: string;
  reasonCode?: string;
  metadata?: Record<string, string | number | boolean>;
}
