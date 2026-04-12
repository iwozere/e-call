import { canShare } from '../lib/invite/canShare';
import { isLikelyMobileDevice } from '../lib/invite/isLikelyMobileDevice';

export interface InviteActionsProps {
  onShare: () => void;
  onSms: () => void;
  onEmail: () => void;
  onCopy: () => void;
}

export function InviteActions({ onShare, onSms, onEmail, onCopy }: InviteActionsProps) {
  const showShare = canShare();
  const showSms = isLikelyMobileDevice();

  return (
    <div className="invite-panel__actions" role="group" aria-label="Invitation options">
      {showShare && (
        <button type="button" className="btn btn--primary invite-panel__action" onClick={onShare}>
          Share
        </button>
      )}
      {showSms && (
        <button type="button" className="btn btn--secondary invite-panel__action" onClick={onSms}>
          Invite by SMS
        </button>
      )}
      <button type="button" className="btn btn--secondary invite-panel__action" onClick={onEmail}>
        Email
      </button>
      <button type="button" className="btn btn--secondary invite-panel__action" onClick={onCopy}>
        Copy link
      </button>
    </div>
  );
}
