import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import type { AppEnv } from '../config/env.js';
import { clientIpFromReq, hashClientIp } from '../util/ipHash.js';

export function requestContextMiddleware(env: AppEnv) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.get('x-request-id');
    const requestId =
      typeof incoming === 'string' && incoming.trim().length > 0 ? incoming.trim() : nanoid(16);
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const ip = clientIpFromReq(
      req,
      env.trustProxy,
      req.headers['x-forwarded-for'] as string | string[] | undefined
    );
    req.sourceIpHash = hashClientIp(ip, env.auditIpSalt);

    const ua = req.headers['user-agent'];
    req.userAgent = typeof ua === 'string' ? ua : undefined;

    next();
  };
}
