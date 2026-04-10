import { AccessToken } from 'livekit-server-sdk';
import type { AppEnv } from '../config/env.js';
import { assertLivekitConfigured } from '../config/env.js';

export interface LiveKitJoinPayload {
  livekitUrl: string;
  token: string;
}

export async function createLiveKitJoinToken(
  env: AppEnv,
  roomName: string,
  identity: string,
  name: string
): Promise<LiveKitJoinPayload> {
  assertLivekitConfigured(env);

  const at = new AccessToken(env.livekitApiKey!, env.livekitApiSecret!, {
    identity,
    name,
    ttl: '4h',
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return {
    livekitUrl: env.livekitUrl!,
    token,
  };
}
