import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

/**
 * One-way hash of a client IP for audit correlation without storing raw IPs.
 * Optional salt (AUDIT_IP_SALT) reduces rainbow-table risk across deployments.
 */
export function hashClientIp(ip: string | undefined, salt: string | undefined): string | undefined {
  if (!ip || ip.trim() === '') return undefined;
  const normalized = ip.trim().toLowerCase();
  const h = createHash('sha256');
  h.update(salt ?? 'e-call-audit-ip');
  h.update('|');
  h.update(normalized);
  return h.digest('hex').slice(0, 32);
}

export function clientIpFromReq(
  req: { ip?: string; socket?: { remoteAddress?: string } },
  trustProxy: boolean,
  xForwardedFor?: string | string[]
): string | undefined {
  if (trustProxy && xForwardedFor) {
    const raw = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    const first = raw.split(',')[0]?.trim();
    if (first) return first;
  }
  if (req.ip && req.ip !== '') return req.ip;
  return req.socket?.remoteAddress;
}

type HandshakeLike = {
  address?: string;
  headers: IncomingHttpHeaders;
};

/** Remote address for Socket.IO handshake (respects TRUST_PROXY for X-Forwarded-For). */
export function clientIpFromHandshake(handshake: HandshakeLike, trustProxy: boolean): string | undefined {
  const xff = handshake.headers['x-forwarded-for'];
  if (trustProxy && xff) {
    const raw = Array.isArray(xff) ? xff[0] : xff;
    const first = raw.split(',')[0]?.trim();
    if (first) return first;
  }
  return handshake.address;
}
