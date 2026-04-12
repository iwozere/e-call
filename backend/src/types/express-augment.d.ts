import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
    sourceIpHash?: string;
    userAgent?: string;
  }
}

export {};
