import { useCallback, useEffect, useRef, useState } from 'react';
import { buildInviteMessage } from '../lib/invite/buildInviteMessage';
import { buildMailtoLink } from '../lib/invite/buildMailtoLink';
import { buildSmsLink } from '../lib/invite/buildSmsLink';
import { trackInviteEvent } from '../lib/invite/analytics';
import { isAbortError } from '../lib/invite/isAbortError';

const SHARE_TITLE = 'Join my call';
const SHARE_TEXT = 'Join my video call using this link.';
const EMAIL_SUBJECT = 'Join my video call';

const COPY_FEEDBACK_MS = 1750;

export interface UseInviteActionsInput {
  inviteUrl: string;
  roomCode: string;
  /** When false, skip invite_panel_viewed tracking on mount. */
  panelActive: boolean;
}

export function useInviteActions({ inviteUrl, roomCode, panelActive }: UseInviteActionsInput) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copyManual, setCopyManual] = useState(false);
  const prevPanelActiveRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const setTimedFeedback = useCallback(
    (message: string | null, ms: number) => {
      clearFeedbackTimer();
      setFeedback(message);
      if (message && ms > 0) {
        feedbackTimerRef.current = setTimeout(() => {
          setFeedback(null);
          feedbackTimerRef.current = null;
        }, ms);
      }
    },
    [clearFeedbackTimer]
  );

  useEffect(() => () => clearFeedbackTimer(), [clearFeedbackTimer]);

  useEffect(() => {
    if (panelActive && !prevPanelActiveRef.current) {
      trackInviteEvent('invite_panel_viewed');
    }
    prevPanelActiveRef.current = panelActive;
  }, [panelActive]);

  const share = useCallback(async () => {
    trackInviteEvent('invite_share_clicked');
    if (typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: SHARE_TITLE,
        text: SHARE_TEXT,
        url: inviteUrl,
      });
      setTimedFeedback('Invitation shared.', 2000);
    } catch (err) {
      if (isAbortError(err)) {
        setFeedback(null);
        return;
      }
      trackInviteEvent('invite_share_failed');
      setTimedFeedback('Sharing is unavailable. Copy the link instead.', 4000);
    }
  }, [inviteUrl, setTimedFeedback]);

  const copyLink = useCallback(async () => {
    trackInviteEvent('invite_copy_clicked');
    setCopyManual(false);
    try {
      await navigator.clipboard.writeText(inviteUrl);
      trackInviteEvent('invite_copy_succeeded');
      setTimedFeedback('Link copied.', COPY_FEEDBACK_MS);
    } catch {
      trackInviteEvent('invite_copy_failed');
      setCopyManual(true);
      setTimedFeedback('Copy failed. Select and copy the link manually.', 6000);
    }
  }, [inviteUrl, setTimedFeedback]);

  const openSms = useCallback(() => {
    trackInviteEvent('invite_sms_clicked');
    const body = buildInviteMessage({ inviteUrl, roomCode, variant: 'sms' });
    window.location.href = buildSmsLink(body);
  }, [inviteUrl, roomCode]);

  const openEmail = useCallback(() => {
    trackInviteEvent('invite_email_clicked');
    const body = buildInviteMessage({ inviteUrl, roomCode, variant: 'email' });
    window.location.href = buildMailtoLink(EMAIL_SUBJECT, body);
  }, [inviteUrl, roomCode]);

  return {
    feedback,
    copyManual,
    share,
    copyLink,
    openSms,
    openEmail,
  };
}
