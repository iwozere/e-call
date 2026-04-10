import { useState } from 'react';

export interface InvitePanelProps {
  inviteUrl: string;
}

export function InvitePanel({ inviteUrl }: InvitePanelProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: 'Join my call',
        text: 'Join this room',
        url: inviteUrl,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="invite-panel">
      <p className="invite-panel__label">Invite link</p>
      <div className="invite-panel__row">
        <code className="invite-panel__url">{inviteUrl}</code>
        <button type="button" className="invite-panel__copy" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
        {typeof navigator.share === 'function' && (
          <button type="button" className="invite-panel__share" onClick={share}>
            Share
          </button>
        )}
      </div>
    </div>
  );
}
