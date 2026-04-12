import { nanoid } from 'nanoid';
import type { AppLogger } from '../logging/logger.js';
import type { AuditActorType, AuditEvent, AuditOutcome } from './types.js';

export type AuditEventInput = Omit<AuditEvent, 'eventId' | 'timestamp'> & {
  eventType: string;
  outcome: AuditOutcome;
  actorType: AuditActorType;
};

export class AuditLog {
  constructor(private readonly logger: AppLogger) {}

  emit(input: AuditEventInput): void {
    const event: AuditEvent = {
      eventId: nanoid(16),
      timestamp: new Date().toISOString(),
      ...input,
    };
    this.logger.audit(event);
  }
}
