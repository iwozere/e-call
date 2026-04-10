export interface CallControlsProps {
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onLeave: () => void;
  mediaDisabled?: boolean;
}

export function CallControls({
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onLeave,
  mediaDisabled,
}: CallControlsProps) {
  return (
    <div className="call-controls">
      <button
        type="button"
        className="call-controls__btn"
        onClick={onToggleMic}
        disabled={mediaDisabled}
        aria-pressed={micOn}
      >
        {micOn ? 'Mute' : 'Unmute'}
      </button>
      <button
        type="button"
        className="call-controls__btn"
        onClick={onToggleCam}
        disabled={mediaDisabled}
        aria-pressed={camOn}
      >
        {camOn ? 'Camera off' : 'Camera on'}
      </button>
      <button
        type="button"
        className="call-controls__btn call-controls__btn--danger"
        onClick={onLeave}
      >
        Leave
      </button>
    </div>
  );
}
