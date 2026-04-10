import { useCallback, useEffect, useState } from 'react';

export type MediaPermissionError =
  | 'NotAllowedError'
  | 'NotFoundError'
  | 'NotReadableError'
  | 'Unknown';

function mapError(e: unknown): MediaPermissionError {
  if (e && typeof e === 'object' && 'name' in e) {
    const n = (e as DOMException).name;
    if (n === 'NotAllowedError') return 'NotAllowedError';
    if (n === 'NotFoundError') return 'NotFoundError';
    if (n === 'NotReadableError') return 'NotReadableError';
  }
  return 'Unknown';
}

export interface UseLocalMediaResult {
  stream: MediaStream | null;
  loading: boolean;
  error: MediaPermissionError | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  setVideoEnabled: (on: boolean) => void;
  setAudioEnabled: (on: boolean) => void;
  retry: () => void;
}

export function useLocalMedia(enabled: boolean): UseLocalMediaResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MediaPermissionError | null>(null);
  const [videoEnabled, setVideoEnabledState] = useState(true);
  const [audioEnabled, setAudioEnabledState] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
      } catch (e) {
        if (!cancelled) setError(mapError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  useEffect(() => {
    if (!stream) return;
    const vt = stream.getVideoTracks()[0];
    const at = stream.getAudioTracks()[0];
    if (vt) vt.enabled = videoEnabled;
    if (at) at.enabled = audioEnabled;
  }, [stream, videoEnabled, audioEnabled]);

  const setVideoEnabled = useCallback((on: boolean) => {
    setVideoEnabledState(on);
  }, []);

  const setAudioEnabled = useCallback((on: boolean) => {
    setAudioEnabledState(on);
  }, []);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  return {
    stream,
    loading,
    error,
    videoEnabled,
    audioEnabled,
    setVideoEnabled,
    setAudioEnabled,
    retry,
  };
}
