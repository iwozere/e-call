import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  type LocalParticipant,
  type RemoteParticipant,
} from 'livekit-client';

export interface LiveKitTile {
  id: string;
  displayName: string;
  isLocal: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  videoOff: boolean;
  audioMuted: boolean;
}

export interface UseLiveKitRoomOptions {
  livekitUrl: string | undefined;
  token: string | undefined;
  localStream: MediaStream | null;
  displayName: string;
  enabled: boolean;
}

export interface UseLiveKitRoomResult {
  tiles: LiveKitTile[];
  connected: boolean;
  error: string | null;
  leave: () => void;
}

function localParticipantToTile(
  p: LocalParticipant,
  localStream: MediaStream | null,
  localLabel: string
): LiveKitTile {
  const videoTrack = localStream?.getVideoTracks()[0] ?? null;
  const audioTrack = localStream?.getAudioTracks()[0] ?? null;
  return {
    id: p.identity,
    displayName: localLabel,
    isLocal: true,
    videoTrack,
    audioTrack,
    videoOff: !videoTrack || !videoTrack.enabled,
    audioMuted: !audioTrack || !audioTrack.enabled,
  };
}

function remoteParticipantToTile(p: RemoteParticipant): LiveKitTile {
  const vp = Array.from(p.videoTrackPublications.values()).find((pub) => pub.isSubscribed);
  const ap = Array.from(p.audioTrackPublications.values()).find((pub) => pub.isSubscribed);
  const videoTrack = vp?.track?.mediaStreamTrack ?? null;
  const audioTrack = ap?.track?.mediaStreamTrack ?? null;
  return {
    id: p.identity,
    displayName: p.name || p.identity,
    isLocal: false,
    videoTrack,
    audioTrack,
    videoOff: !videoTrack || !videoTrack.enabled,
    audioMuted: !audioTrack || !audioTrack.enabled,
  };
}

function buildTiles(
  room: Room | null,
  localStream: MediaStream | null,
  localLabel: string
): LiveKitTile[] {
  if (!room) return [];
  const tiles: LiveKitTile[] = [
    localParticipantToTile(room.localParticipant, localStream, localLabel),
  ];
  room.remoteParticipants.forEach((p) => {
    tiles.push(remoteParticipantToTile(p));
  });
  return tiles;
}

export function useLiveKitRoom({
  livekitUrl,
  token,
  localStream,
  displayName,
  enabled,
}: UseLiveKitRoomOptions): UseLiveKitRoomResult {
  const [room, setRoom] = useState<Room | null>(null);
  const [tiles, setTiles] = useState<LiveKitTile[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stableName = useMemo(() => displayName.trim() || 'Guest', [displayName]);

  const leave = useCallback(() => {
    void room?.disconnect();
    setRoom(null);
    setConnected(false);
    setTiles([]);
  }, [room]);

  useEffect(() => {
    if (!enabled || !livekitUrl || !token || !localStream) return;

    const r = new Room({ adaptiveStream: true, dynacast: true });
    setError(null);

    const refresh = () => setTiles(buildTiles(r, localStream, stableName));

    r.on(RoomEvent.ParticipantConnected, refresh);
    r.on(RoomEvent.ParticipantDisconnected, refresh);
    r.on(RoomEvent.TrackSubscribed, refresh);
    r.on(RoomEvent.TrackUnsubscribed, refresh);
    r.on(RoomEvent.LocalTrackPublished, refresh);
    r.on(RoomEvent.LocalTrackUnpublished, refresh);

    (async () => {
      try {
        await r.connect(livekitUrl, token);
        const v = localStream.getVideoTracks()[0];
        const a = localStream.getAudioTracks()[0];
        if (v) await r.localParticipant.publishTrack(v, { source: Track.Source.Camera });
        if (a) await r.localParticipant.publishTrack(a, { source: Track.Source.Microphone });
        setRoom(r);
        setConnected(true);
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'LiveKit connection failed');
        r.disconnect();
      }
    })();

    return () => {
      r.off(RoomEvent.ParticipantConnected, refresh);
      r.off(RoomEvent.ParticipantDisconnected, refresh);
      r.off(RoomEvent.TrackSubscribed, refresh);
      r.off(RoomEvent.TrackUnsubscribed, refresh);
      r.off(RoomEvent.LocalTrackPublished, refresh);
      r.off(RoomEvent.LocalTrackUnpublished, refresh);
      void r.disconnect();
      setRoom(null);
      setConnected(false);
      setTiles([]);
    };
  }, [enabled, livekitUrl, token, localStream, stableName]);

  return { tiles, connected, error, leave };
}
