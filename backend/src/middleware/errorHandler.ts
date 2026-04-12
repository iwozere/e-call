import type { NextFunction, Request, Response } from 'express';
import type { AppLogger } from '../logging/logger.js';

export function errorHandler(logger: AppLogger, nodeEnv: string) {
  const isDev = nodeEnv !== 'production';

  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    logger.error('request failed', {
      requestId: req.requestId,
      err: message,
      ...(isDev && stack ? { stack } : {}),
    });

    if (res.headersSent) {
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      ...(isDev ? { detail: message } : {}),
    });
  };
}
