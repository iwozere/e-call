import { useId } from 'react';
import { useInviteActions } from '../hooks/useInviteActions';
import type { InviteData } from '../lib/invite/types';
import { InviteActions } from './InviteActions';
import { RoomCodeBox } from './RoomCodeBox';

export interface InvitePanelProps {
  data: InviteData;
  /** When false, the panel is not rendered (e.g. another participant already joined). */
  visible: boolean;
}

export function InvitePanel({ data, visible }: InvitePanelProps) {
  const uid = useId();
  const titleId = `invite-panel-title-${uid}`;
  const urlInputId = `invite-room-url-${uid}`;
  const fallbackHintId = `invite-fallback-hint-${uid}`;
  const manualCopyId = `invite-manual-copy-${uid}`;

  const { inviteUrl, roomCode } = data;

  const actions = useInviteActions({
    inviteUrl,
    roomCode,
    panelActive: visible,
  });

  if (!visible) return null;

  return (
    <section className="invite-panel" aria-labelledby={titleId}>
      <h2 id={titleId} className="invite-panel__title">
        Room is ready. Invite another participant to join.
      </h2>
      <p className="invite-panel__helper">Send the link by text, email, or copy it manually.</p>

      <label className="invite-panel__url-field" htmlFor={urlInputId}>
        <span className="invite-panel__sublabel">Room link</span>
        <input
          id={urlInputId}
          className="invite-panel__url-input"
          readOnly
          value={inviteUrl}
          onFocus={(e) => e.target.select()}
          aria-describedby={
            [actions.copyManual ? manualCopyId : '', fallbackHintId].filter(Boolean).join(' ') ||
            undefined
          }
        />
      </label>

      {actions.copyManual && (
        <p className="invite-panel__manual-hint" id={manualCopyId}>
          Select the link above and copy it (Ctrl+C or ⌘+C).
        </p>
      )}

      <RoomCodeBox roomCode={roomCode} />

      <InviteActions
        onShare={actions.share}
        onSms={actions.openSms}
        onEmail={actions.openEmail}
        onCopy={actions.copyLink}
      />

      <p id={fallbackHintId} className="invite-panel__hint">
        If sharing does not work, send the room code or copy the link manually.
      </p>

      <div className="invite-panel__feedback" role="status" aria-live="polite" aria-atomic="true">
        {actions.feedback ? <span>{actions.feedback}</span> : null}
      </div>
    </section>
  );
}
