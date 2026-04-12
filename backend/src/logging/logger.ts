import type { AuditEvent } from '../audit/types.js';

export type LogLevelName = 'error' | 'warn' | 'info' | 'debug';

export interface AppLogger {
  error(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  debug(msg: string, fields?: Record<string, unknown>): void;
  audit(event: AuditEvent): void;
  child(fields: Record<string, unknown>): AppLogger;
}

const LEVEL_RANK: Record<LogLevelName, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function parseLogLevel(raw: string | undefined): LogLevelName {
  const n = (raw ?? 'info').toLowerCase();
  if (n === 'error' || n === 'warn' || n === 'info' || n === 'debug') return n;
  return 'info';
}

function shouldLog(configured: LogLevelName, msgLevel: LogLevelName): boolean {
  return LEVEL_RANK[msgLevel] <= LEVEL_RANK[configured];
}

function writeLine(payload: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export function createJsonLogger(options: {
  level: string | undefined;
  service: string;
}): AppLogger {
  const configured = parseLogLevel(options.level);

  function baseFields(extra?: Record<string, unknown>): Record<string, unknown> {
    return { service: options.service, ...extra };
  }

  function logAt(
    msgLevel: LogLevelName,
    msg: string,
    fields?: Record<string, unknown>
  ): void {
    if (!shouldLog(configured, msgLevel)) return;
    writeLine({
      level: msgLevel,
      time: new Date().toISOString(),
      msg,
      ...baseFields(fields),
    });
  }

  const self: AppLogger = {
    error(msg, fields) {
      logAt('error', msg, fields);
    },
    warn(msg, fields) {
      logAt('warn', msg, fields);
    },
    info(msg, fields) {
      logAt('info', msg, fields);
    },
    debug(msg, fields) {
      logAt('debug', msg, fields);
    },
    audit(event: AuditEvent) {
      writeLine({
        level: 'audit',
        time: event.timestamp,
        ...event,
      });
    },
    child(fields) {
      return createChildLogger(configured, options.service, fields);
    },
  };
  return self;
}

function createChildLogger(
  configured: LogLevelName,
  service: string,
  parentFields: Record<string, unknown>
): AppLogger {
  function merge(fields?: Record<string, unknown>): Record<string, unknown> {
    return { service, ...parentFields, ...fields };
  }

  function logAt(
    msgLevel: LogLevelName,
    msg: string,
    fields?: Record<string, unknown>
  ): void {
    if (!shouldLog(configured, msgLevel)) return;
    writeLine({
      level: msgLevel,
      time: new Date().toISOString(),
      msg,
      ...merge(fields),
    });
  }

  return {
    error(msg, fields) {
      logAt('error', msg, fields);
    },
    warn(msg, fields) {
      logAt('warn', msg, fields);
    },
    info(msg, fields) {
      logAt('info', msg, fields);
    },
    debug(msg, fields) {
      logAt('debug', msg, fields);
    },
    audit(event: AuditEvent) {
      writeLine({
        level: 'audit',
        time: event.timestamp,
        ...event,
        ...parentFields,
      });
    },
    child(fields) {
      return createChildLogger(configured, service, { ...parentFields, ...fields });
    },
  };
}
