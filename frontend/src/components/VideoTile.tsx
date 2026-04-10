import { useEffect, useRef } from 'react';

export interface VideoTileProps {
  stream: MediaStream | null;
  displayName: string;
  isLocal: boolean;
  videoOff: boolean;
  audioMuted: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function VideoTile({
  stream,
  displayName,
  isLocal,
  videoOff,
  audioMuted,
}: VideoTileProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    return () => {
      el.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="video-tile">
      <video
        ref={ref}
        className="video-tile__video"
        style={{ opacity: videoOff ? 0 : 1 }}
        autoPlay
        playsInline
        muted={isLocal}
      />
      {videoOff && (
        <div className="video-tile__avatar" aria-hidden>
          {initials(displayName)}
        </div>
      )}
      <div className="video-tile__meta">
        <span className="video-tile__name">{displayName}</span>
        {audioMuted && (
          <span className="video-tile__muted" title="Microphone muted">
            🔇
          </span>
        )}
      </div>
    </div>
  );
}
