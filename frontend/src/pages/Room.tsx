import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRoom, joinToken } from '../lib/api';
import type { JoinTokenResponse, RoomInfo, RoomMode } from '../types';
import { useRoomStore } from '../store/roomStore';
import { useLocalMedia } from '../hooks/useLocalMedia';
import { useP2PCall } from '../hooks/useP2PCall';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';
import { VideoGrid, type GridParticipant } from '../components/VideoGrid';
import { CallControls } from '../components/CallControls';
import { InvitePanel } from '../components/InvitePanel';
import { buildInviteUrl } from '../lib/invite/buildInviteUrl';
import { formatRoomCode } from '../lib/invite/formatRoomCode';
import { DisplayNameModal } from '../components/DisplayNameModal';
import { PermissionError } from '../components/PermissionError';

function streamFromTracks(
  video: MediaStreamTrack | null,
  audio: MediaStreamTrack | null
): MediaStream | null {
  const tracks = [video, audio].filter(Boolean) as MediaStreamTrack[];
  if (!tracks.length) return null;
  return new MediaStream(tracks);
}

export function Room() {
  const { roomId: rawId } = useParams();
  const roomId = rawId ?? '';
  const navigate = useNavigate();
  const { displayName, setDisplayName } = useRoomStore();

  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joinPayload, setJoinPayload] = useState<JoinTokenResponse | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [nameOpen, setNameOpen] = useState(!displayName.trim());

  const nameReady = displayName.trim().length > 0;
  const mediaEnabled = nameReady && !!roomInfo && !nameOpen;

  const media = useLocalMedia(mediaEnabled);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoadError(null);
    (async () => {
      try {
        const info = await getRoom(roomId);
        if (!cancelled) setRoomInfo(info);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error && e.message === 'ROOM_NOT_FOUND' ? 'notfound' : 'unknown');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !roomInfo || !media.stream || media.loading || media.error) return;
    let cancelled = false;
    setJoinError(null);
    const name = displayName.trim();
    if (!name) return;
    (async () => {
      try {
        const j = await joinToken(roomId, name);
        if (cancelled) return;
        setJoinPayload(j);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof Error && e.message === 'ROOM_FULL') {
          setJoinError('This room is full (P2P allows two people).');
        } else {
          setJoinError('Could not join this room.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, roomInfo, media.stream, media.loading, media.error, displayName]);

  const mode: RoomMode = roomInfo?.mode ?? 'p2p';

  const p2p = useP2PCall({
    roomId,
    participantId: mode === 'p2p' ? joinPayload?.participantId ?? null : null,
    displayName: displayName.trim(),
    localStream: media.stream,
    enabled: mode === 'p2p' && !!joinPayload?.participantId && !!media.stream,
  });

  const sfu = useLiveKitRoom({
    livekitUrl: joinPayload?.livekitUrl,
    token: joinPayload?.token,
    localStream: media.stream,
    displayName: displayName.trim(),
    enabled:
      mode === 'sfu' &&
      !!joinPayload?.livekitUrl &&
      !!joinPayload?.token &&
      !!media.stream,
  });

  const signalingError = mode === 'p2p' ? p2p.error : sfu.error;
  const connected = mode === 'p2p' ? p2p.connected : sfu.connected;
  const showConnecting = !!joinPayload && !signalingError && !connected;

  const inviteData = useMemo(
    () => ({
      roomId,
      roomCode: formatRoomCode(roomId),
      inviteUrl: buildInviteUrl(roomId),
      roomMode: mode,
    }),
    [roomId, mode]
  );

  const otherParticipantPresent = useMemo(() => {
    if (mode === 'p2p') {
      return p2p.remoteStreams.size > 0;
    }
    return sfu.tiles.some((t) => !t.isLocal);
  }, [mode, p2p.remoteStreams, sfu.tiles]);

  const showInvitePanel = !joinError && !otherParticipantPresent;

  const gridParticipants: GridParticipant[] = useMemo(() => {
    if (mode === 'p2p' && joinPayload) {
      const selfId = joinPayload.participantId;
      const list: GridParticipant[] = [
        {
          id: selfId,
          stream: media.stream,
          displayName: displayName.trim() || 'You',
          isLocal: true,
          videoOff: !media.videoEnabled || !media.stream?.getVideoTracks()[0]?.enabled,
          audioMuted: !media.audioEnabled,
        },
      ];
      const nameById = new Map(p2p.participants.map((p) => [p.participantId, p.displayName]));
      p2p.remoteStreams.forEach((stream, remoteId) => {
        list.push({
          id: remoteId,
          stream,
          displayName: nameById.get(remoteId) ?? 'Guest',
          isLocal: false,
          videoOff: !stream.getVideoTracks()[0]?.enabled,
          audioMuted: !stream.getAudioTracks()[0]?.enabled,
        });
      });
      return list;
    }
    if (mode === 'sfu') {
      return sfu.tiles.map((t) => ({
        id: t.id,
        stream: streamFromTracks(t.videoTrack, t.audioTrack),
        displayName: t.displayName,
        isLocal: t.isLocal,
        videoOff: t.videoOff,
        audioMuted: t.audioMuted,
      }));
    }
    return [];
  }, [mode, joinPayload, media, displayName, p2p.participants, p2p.remoteStreams, sfu.tiles]);

  const leaveCall = useCallback(() => {
    if (mode === 'p2p') p2p.leave();
    else sfu.leave();
    media.stream?.getTracks().forEach((t) => t.stop());
    navigate('/');
  }, [mode, p2p, sfu, navigate, media.stream]);

  if (!roomId) {
    return <p className="page__center">Invalid link.</p>;
  }

  if (loadError === 'notfound') {
    return (
      <div className="page__center">
        <p>This room does not exist or has expired.</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
          Home
        </button>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page__center">
        <p>Something went wrong loading this room.</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
          Home
        </button>
      </div>
    );
  }

  return (
    <div className="page room">
      <DisplayNameModal
        open={nameOpen}
        initialValue={displayName}
        onSave={(n) => {
          setDisplayName(n);
          setNameOpen(false);
        }}
      />

      {media.error && (
        <PermissionError kind={media.error} onRetry={media.retry} />
      )}

      {media.loading && !media.error && <p className="room__status">Requesting camera and microphone…</p>}

      {joinError && <p className="form-error">{joinError}</p>}

      {showConnecting && <p className="room__status">Connecting to the call…</p>}

      {signalingError && <p className="form-error">{signalingError}</p>}

      <InvitePanel data={inviteData} visible={showInvitePanel} />

      {media.stream && (
        <>
          <VideoGrid participants={gridParticipants} />
          <CallControls
            micOn={media.audioEnabled}
            camOn={media.videoEnabled}
            onToggleMic={() => media.setAudioEnabled(!media.audioEnabled)}
            onToggleCam={() => media.setVideoEnabled(!media.videoEnabled)}
            onLeave={leaveCall}
          />
        </>
      )}
    </div>
  );
}
