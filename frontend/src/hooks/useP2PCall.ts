import { useCallback, useEffect, useRef, useState } from 'react';
import type { ParticipantSummary } from '../types';
import { createSignalingSocket } from '../lib/socket';
import type { Socket } from 'socket.io-client';

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_PASSWORD;
  // VITE_TURN_URLS accepts comma-separated URLs (same credential); falls back to VITE_TURN_URL
  const raw = import.meta.env.VITE_TURN_URLS ?? import.meta.env.VITE_TURN_URL;
  if (raw?.trim() && username && credential) {
    const urls = raw.split(',').map((u: string) => u.trim()).filter(Boolean);
    if (urls.length) servers.push({ urls, username, credential });
  }
  return servers;
}

function shouldInitiateOffer(localId: string, remoteId: string): boolean {
  return localId < remoteId;
}

export interface UseP2PCallOptions {
  roomId: string;
  participantId: string | null;
  displayName: string;
  localStream: MediaStream | null;
  enabled: boolean;
}

export interface UseP2PCallResult {
  remoteStreams: Map<string, MediaStream>;
  participants: ParticipantSummary[];
  connected: boolean;
  error: string | null;
  leave: () => void;
}

export function useP2PCall({
  roomId,
  participantId,
  displayName,
  localStream,
  enabled,
}: UseP2PCallOptions): UseP2PCallResult {
  const [remoteStreams, setRemoteStreams] = useState(() => new Map<string, MediaStream>());
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const cleanupPeer = useCallback((remoteId: string) => {
    const pc = pcsRef.current.get(remoteId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
      pcsRef.current.delete(remoteId);
    }
    pendingIceRef.current.delete(remoteId);
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(remoteId);
      return next;
    });
  }, []);

  const teardown = useCallback(() => {
    const s = socketRef.current;
    if (s?.connected && participantId) {
      s.emit('leave-room', { roomId, participantId });
    }
    s?.disconnect();
    socketRef.current = null;
    for (const id of [...pcsRef.current.keys()]) {
      cleanupPeer(id);
    }
    pcsRef.current.clear();
    setConnected(false);
    setParticipants([]);
  }, [roomId, participantId, cleanupPeer]);

  const leave = useCallback(() => {
    teardown();
  }, [teardown]);

  const ensurePeer = useCallback(
    (remoteId: string, socket: Socket) => {
      if (pcsRef.current.has(remoteId)) return pcsRef.current.get(remoteId)!;

      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
      pcsRef.current.set(remoteId, pc);

      localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream));

      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !participantId) return;
        socket.emit('ice-candidate', {
          roomId,
          toParticipantId: remoteId,
          candidate: ev.candidate.toJSON(),
        });
      };

      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        if (stream) {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(remoteId, stream);
            return next;
          });
        }
      };

      return pc;
    },
    [localStream, roomId, participantId]
  );

  const flushPendingIce = useCallback(async (remoteId: string, pc: RTCPeerConnection) => {
    const q = pendingIceRef.current.get(remoteId);
    if (!q?.length) return;
    for (const c of q) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* ignore */
      }
    }
    pendingIceRef.current.set(remoteId, []);
  }, []);

  const negotiate = useCallback(
    async (selfId: string, remoteId: string, socket: Socket) => {
      const pc = ensurePeer(remoteId, socket);
      if (!shouldInitiateOffer(selfId, remoteId)) return;
      if (pc.signalingState !== 'stable') return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', {
        roomId,
        toParticipantId: remoteId,
        sdp: pc.localDescription,
      });
    },
    [ensurePeer, roomId]
  );

  useEffect(() => {
    if (!enabled || !participantId || !localStream) return;

    setError(null);
    const socket = createSignalingSocket();
    socketRef.current = socket;

    const onRoomState = (list: ParticipantSummary[]) => {
      setParticipants(list);
      for (const p of list) {
        if (p.participantId === participantId) continue;
        void negotiate(participantId, p.participantId, socket);
      }
    };

    const onParticipantJoined = (p: { participantId: string }) => {
      if (p.participantId === participantId) return;
      void negotiate(participantId, p.participantId, socket);
    };

    const onOffer = async (msg: {
      fromParticipantId?: string;
      sdp?: RTCSessionDescriptionInit;
    }) => {
      const from = msg.fromParticipantId;
      if (!from || !msg.sdp) return;
      const pc = ensurePeer(from, socket);
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        /* may handle glare later */
      }
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      await flushPendingIce(from, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', {
        roomId,
        toParticipantId: from,
        sdp: pc.localDescription,
      });
    };

    const onAnswer = async (msg: {
      fromParticipantId?: string;
      sdp?: RTCSessionDescriptionInit;
    }) => {
      const from = msg.fromParticipantId;
      if (!from || !msg.sdp) return;
      const pc = pcsRef.current.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      await flushPendingIce(from, pc);
    };

    const onIce = async (msg: {
      fromParticipantId?: string;
      candidate?: RTCIceCandidateInit;
    }) => {
      const from = msg.fromParticipantId;
      if (!from || !msg.candidate) return;
      const pc = pcsRef.current.get(from);
      if (!pc?.remoteDescription) {
        const q = pendingIceRef.current.get(from) ?? [];
        q.push(msg.candidate);
        pendingIceRef.current.set(from, q);
        return;
      }
      try {
        await pc.addIceCandidate(msg.candidate);
      } catch {
        /* ignore */
      }
    };

    const onParticipantLeft = (msg: { participantId: string }) => {
      cleanupPeer(msg.participantId);
      setParticipants((prev) => prev.filter((p) => p.participantId !== msg.participantId));
    };

    socket.on('room-state', onRoomState);
    socket.on('participant-joined', onParticipantJoined);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIce);
    socket.on('participant-left', onParticipantLeft);
    socket.on('room-full', () => setError('This room is full.'));
    socket.on('join-error', () => setError('Could not join signaling.'));
    socket.on('connect_error', () => setError('Connection to signaling failed.'));

    socket.connect();
    socket.once('connect', () => {
      const name = displayName.trim() || 'Guest';
      socket.emit(
        'join-room',
        { roomId, participantId, displayName: name },
        (err?: string) => {
          if (err) setError(err);
          else setConnected(true);
        }
      );
    });

    return () => {
      socket.off('room-state', onRoomState);
      socket.off('participant-joined', onParticipantJoined);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIce);
      socket.off('participant-left', onParticipantLeft);
      if (socket.connected) {
        socket.emit('leave-room', { roomId, participantId });
      }
      socket.disconnect();
      socketRef.current = null;
      for (const id of [...pcsRef.current.keys()]) {
        const pc = pcsRef.current.get(id);
        if (pc) {
          pc.ontrack = null;
          pc.onicecandidate = null;
          pc.close();
        }
        pcsRef.current.delete(id);
      }
      pendingIceRef.current.clear();
      setConnected(false);
      setParticipants([]);
      setRemoteStreams(new Map());
    };
  }, [
    enabled,
    participantId,
    localStream,
    roomId,
    displayName,
    negotiate,
    ensurePeer,
    flushPendingIce,
    cleanupPeer,
  ]);

  return { remoteStreams, participants, connected, error, leave };
}
