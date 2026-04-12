export type InviteAnalyticsEventName =
  | 'invite_panel_viewed'
  | 'invite_share_clicked'
  | 'invite_sms_clicked'
  | 'invite_email_clicked'
  | 'invite_copy_clicked'
  | 'invite_copy_succeeded'
  | 'invite_copy_failed'
  | 'invite_share_failed';

export function trackInviteEvent(name: InviteAnalyticsEventName): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('ecall-invite', { detail: { name } }));
}
