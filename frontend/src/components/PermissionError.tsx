import type { MediaPermissionError } from '../hooks/useLocalMedia';

export interface PermissionErrorProps {
  kind: MediaPermissionError;
  onRetry: () => void;
}

const messages: Record<string, string> = {
  NotAllowedError:
    'Camera or microphone access was blocked. Allow permissions in your browser settings and try again.',
  NotFoundError: 'No camera or microphone was found on this device.',
  NotReadableError:
    'Your camera or microphone is in use by another application. Close other apps and try again.',
  Unknown: 'Could not access camera or microphone.',
};

export function PermissionError({ kind, onRetry }: PermissionErrorProps) {
  return (
    <div className="permission-error" role="alert">
      <p>{messages[kind] ?? messages.Unknown}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
