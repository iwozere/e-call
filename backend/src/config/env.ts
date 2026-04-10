import 'dotenv/config';

function requireString(name: string): string {
  const v = process.env[name];
  if (v === undefined || v.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

function optionalString(name: string): string | undefined {
  const v = process.env[name];
  if (v === undefined || v.trim() === '') return undefined;
  return v.trim();
}

export interface AppEnv {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  appBaseUrl: string;
  roomTtlMinutes: number;
  listenHost?: string;
  trustProxy: boolean;
  livekitUrl?: string;
  livekitApiKey?: string;
  livekitApiSecret?: string;
}

export function loadEnv(): AppEnv {
  const port = Number.parseInt(requireString('PORT'), 10);
  if (Number.isNaN(port)) throw new Error('PORT must be a number');

  const roomTtl = Number.parseInt(requireString('ROOM_TTL_MINUTES'), 10);
  if (Number.isNaN(roomTtl)) throw new Error('ROOM_TTL_MINUTES must be a number');

  const livekitUrl = optionalString('LIVEKIT_URL');
  const livekitApiKey = optionalString('LIVEKIT_API_KEY');
  const livekitApiSecret = optionalString('LIVEKIT_API_SECRET');

  const hasAnyLivekit = livekitUrl || livekitApiKey || livekitApiSecret;
  const hasAllLivekit = livekitUrl && livekitApiKey && livekitApiSecret;
  if (hasAnyLivekit && !hasAllLivekit) {
    throw new Error(
      'SFU: set all of LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET or omit all for P2P-only dev.'
    );
  }

  const trustRaw = optionalString('TRUST_PROXY');
  const trustProxy =
    trustRaw === '1' ||
    trustRaw?.toLowerCase() === 'true' ||
    trustRaw?.toLowerCase() === 'yes';

  return {
    port,
    nodeEnv: optionalString('NODE_ENV') ?? 'development',
    corsOrigin: requireString('CORS_ORIGIN'),
    appBaseUrl: requireString('APP_BASE_URL').replace(/\/$/, ''),
    roomTtlMinutes: roomTtl,
    listenHost: optionalString('LISTEN_HOST'),
    trustProxy,
    livekitUrl,
    livekitApiKey,
    livekitApiSecret,
  };
}

export function assertLivekitConfigured(env: AppEnv): void {
  if (!env.livekitUrl || !env.livekitApiKey || !env.livekitApiSecret) {
    throw new Error('LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.');
  }
}
