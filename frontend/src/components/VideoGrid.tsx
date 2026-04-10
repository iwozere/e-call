import { useMemo } from 'react';
import { VideoTile } from './VideoTile';

export interface GridParticipant {
  id: string;
  stream: MediaStream | null;
  displayName: string;
  isLocal: boolean;
  videoOff: boolean;
  audioMuted: boolean;
}

export interface VideoGridProps {
  participants: GridParticipant[];
}

function layoutClass(count: number): string {
  if (count <= 1) return 'video-grid--1';
  if (count === 2) return 'video-grid--2';
  if (count <= 4) return 'video-grid--4';
  if (count <= 6) return 'video-grid--6';
  return 'video-grid--many';
}

export function VideoGrid({ participants }: VideoGridProps) {
  const cls = useMemo(() => layoutClass(participants.length), [participants.length]);

  return (
    <div className={`video-grid ${cls}`}>
      {participants.map((p) => (
        <VideoTile
          key={p.id}
          stream={p.stream}
          displayName={p.displayName}
          isLocal={p.isLocal}
          videoOff={p.videoOff}
          audioMuted={p.audioMuted}
        />
      ))}
    </div>
  );
}
