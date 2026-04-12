import type { Request } from 'express';

export type HttpAuditFields = {
  requestId: string;
  sourceIpHash?: string;
  userAgent?: string;
};

export function httpAuditFromRequest(req: Request): HttpAuditFields {
  return {
    requestId: req.requestId,
    sourceIpHash: req.sourceIpHash,
    userAgent: req.userAgent,
  };
}
