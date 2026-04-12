# Invite Participant UX and Technical Specification

This document defines the complete UX and technical specification for inviting a second participant into a browser-based WebRTC 1-to-1 call room. The application already supports room creation and direct room access by URL. The purpose of this specification is to define how a room owner should notify another participant that a room has been created and how the second participant should receive and open the invitation.

The primary design goal is simple room sharing without requiring third-party messenger integrations. The recommended invitation model is a layered approach built around shareable URLs, browser-native sharing, SMS shortcuts on mobile, email fallback, and manual copy-link behavior. The Web Share API allows the application to invoke the operating system share sheet in supported browsers, while `sms:` and `mailto:` links can be used as targeted fallbacks depending on the device and user context [cite:34][cite:35][cite:45].

## Product goal

The product must let one user create a call room and invite another user with minimal friction. The expected flow is:

1. User creates a room.
2. The application immediately shows the room invitation UI.
3. The user chooses how to send the invitation.
4. The second participant receives either a link or a short room code.
5. The second participant opens the room and joins the call.

The invitation flow must not depend on WhatsApp, Telegram, or any single external messaging platform. Instead, it must rely on universal browser and device capabilities such as system sharing, SMS composition, email composition, and clipboard copy [cite:34][cite:44][cite:45].

## Core invitation strategy

The invitation system must use **multi-channel fallback logic** instead of a single transport. This is necessary because browser capabilities differ by platform, and SMS or share-sheet behavior is not uniform across desktop and mobile environments [cite:34][cite:35][cite:45].

The recommended priority order is:

1. **Native share sheet** via Web Share API, when supported.
2. **SMS invitation** on mobile devices, using `sms:` deep link where appropriate.
3. **Email invitation** using `mailto:`.
4. **Copy link** as a universal fallback.
5. **Short room code** as a spoken/manual backup.

This layered design ensures the invitation flow works even when one transport method is unavailable. It also avoids hard dependency on any provider-based communications platform for the MVP [cite:34][cite:35][cite:42].

## UX principles

The invitation experience must satisfy the following principles:

- The invitation UI must appear immediately after room creation.
- The user must always see the room URL.
- The user must always have at least one actionable sharing method.
- The user must not be forced to understand technical details such as room IDs or deep links.
- The system must provide a backup method if browser-native sharing is unavailable.
- The invitation text must be short, clear, and safe to send over SMS or email.
- The room code must be visible so the link can be communicated verbally if needed.

The UX must be optimized for speed. The room owner should be able to create and send an invitation in one screen without navigating away from the room context.

## Invitation channels

### 1. Native Share button

The primary CTA should be **Share**.

When `navigator.share` is available, the application must open the system share sheet and pass a short invitation message plus the room URL. The Web Share API is designed specifically for this kind of browser-to-native handoff and is widely useful on mobile browsers, with varying support on desktop browsers [cite:34][cite:35].

#### Required payload

```ts
await navigator.share({
  title: 'Join my call',
  text: 'Join my video call using this link.',
  url: inviteUrl,
});
```

#### UX behavior

- Show **Share** button only if `navigator.share` exists.
- Put this button first in the action group.
- If sharing succeeds, show a success toast.
- If the user cancels the share dialog, do not show an error toast.
- If the API throws a real error, fall back to copy-link suggestion.

### 2. SMS invitation

A dedicated **Invite by SMS** button should be shown on mobile-first layouts, or on devices where SMS has a realistic chance of being useful. SMS deep-link behavior depends on browser and OS, so this option must be treated as a convenience shortcut, not as the only invitation mechanism [cite:39][cite:45].

#### UX behavior

- Clicking the button opens the SMS app with a prefilled body when possible.
- The user still manually selects the recipient and sends the message.
- The browser must never attempt to send an SMS automatically.
- If SMS composition fails or is unsupported, the UI must still offer copy-link and email.

#### SMS message template

Recommended default message:

```text
Join my video call: {inviteUrl}
Room code: {roomCode}
```

A short, plain-text message is preferred because SMS clients and mobile platforms may handle formatting inconsistently [cite:39][cite:43].

#### Technical note

Use an `sms:` deep link. Since platform behavior varies, the implementation must encapsulate SMS URL generation in one utility function that can be adapted later [cite:39][cite:45].

Example implementation shape:

```ts
function buildSmsLink(body: string): string {
  return `sms:?&body=${encodeURIComponent(body)}`;
}
```

The exact separator format may vary between platforms, so the code should keep this logic isolated and easy to adjust.

### 3. Email invitation

A dedicated **Email** button must be available as a universal desktop and mobile fallback. Email composition is a useful baseline because `mailto:` support is broadly understood by browsers and operating systems [cite:42].

#### Email content

Subject:

```text
Join my video call
```

Body:

```text
A video room is ready.

Join here: {inviteUrl}
Room code: {roomCode}
```

#### Technical form

```ts
const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
window.location.href = mailto;
```

### 4. Copy link

A **Copy link** button is mandatory. It is the universal fallback and must always be present regardless of browser support for other channels [cite:44].

#### UX behavior

- Copy the room URL to the clipboard using `navigator.clipboard.writeText(inviteUrl)`.
- Show success feedback for 1.5 to 2 seconds.
- If clipboard API fails, show the URL in a selectable input field and instruct the user to copy manually.

### 5. Room code fallback

The system must display a short **room code** in addition to the full room URL. This code is a manual backup for cases where the link is difficult to share or open.

#### Purpose

- allows spoken invitation over a phone call;
- allows manual room entry if a user cannot tap a link;
- provides a lower-friction backup than dictating a full URL.

#### Rule

The room code should be short, uppercase-friendly, and easy to read aloud. For example:

```text
A7K9Q2
```

The application may map the room code to the room ID internally, or it may simply expose a shortened room ID representation.

## Invitation UI specification

## Placement

The invite UI must exist in two places:

1. Immediately after room creation.
2. Persistently inside the room screen while waiting for another participant.

This ensures the user can invite another person both at room creation time and after already entering the room.

## Main components

The invitation module must contain:

- room status label, for example `Waiting for another participant`;
- visible room URL;
- visible room code;
- primary action buttons;
- short helper text;
- success and error feedback region.

## Recommended component structure

```text
InvitePanel
  ├── RoomStatus
  ├── InviteUrlField
  ├── RoomCodeBox
  ├── InviteActions
  │     ├── ShareButton
  │     ├── SmsButton
  │     ├── EmailButton
  │     └── CopyLinkButton
  └── FeedbackMessage
```

## Recommended button priority

| Priority | Button | Visibility rule |
|---|---|---|
| 1 | Share | Show if `navigator.share` exists [cite:34] |
| 2 | SMS | Show on mobile-capable layout or when enabled by feature policy [cite:39][cite:45] |
| 3 | Email | Always show |
| 4 | Copy link | Always show [cite:44] |

## Suggested screen text

### Status text

```text
Room is ready. Invite another participant to join.
```

### Helper text

```text
Send the link by text, email, or copy it manually.
```

### Copy success

```text
Link copied.
```

### Fallback hint

```text
If sharing does not work, send the room code or copy the link manually.
```

## Responsive behavior

### Mobile

- Large primary Share button at top.
- SMS button visible if configured.
- Action buttons stacked vertically.
- Room code displayed in large high-contrast style.
- Use bottom-safe spacing for thumb interaction.

### Desktop

- Copy link and Email become more important than SMS.
- Action buttons can be displayed inline.
- Room URL should appear in a read-only text field with copy icon.
- Share button may be present if supported, but should not be the only emphasized option.

## Accessibility requirements

The invitation module must meet the following accessibility requirements:

- every action button must have visible text;
- icon-only buttons must also include `aria-label`;
- feedback messages must be readable by screen readers;
- copied/sent status should be exposed with `aria-live="polite"`;
- room code must be selectable text;
- keyboard navigation must support all invitation actions.

## Functional requirements

The invitation feature must support the following capabilities.

### Required behaviors

- generate a valid invite URL from the current room;
- display the full URL;
- display a short room code;
- open native share sheet where available [cite:34];
- open SMS composition on supported devices [cite:39][cite:45];
- open email composition with prefilled subject and body [cite:42];
- copy link to clipboard [cite:44];
- degrade gracefully when APIs are unavailable.

### Non-goals for MVP

The invitation feature must **not** include the following in MVP:

- direct backend SMS sending through Twilio or another provider;
- address book access;
- automatic contact detection;
- delivery tracking;
- push notifications;
- messenger-specific integrations.

These features may be considered later, but they are not part of the base implementation.

## Technical architecture

The frontend must encapsulate invitation logic in a dedicated module.

### Suggested files

```text
src/
  components/
    InvitePanel.tsx
    InviteActions.tsx
    RoomCodeBox.tsx
  lib/
    invite/
      buildInviteUrl.ts
      buildInviteMessage.ts
      buildSmsLink.ts
      buildMailtoLink.ts
      canShare.ts
      canUseClipboard.ts
  hooks/
    useInviteActions.ts
```

### Responsibility split

- `buildInviteUrl.ts` builds canonical room URL.
- `buildInviteMessage.ts` creates display-safe invitation text.
- `buildSmsLink.ts` builds SMS deep link.
- `buildMailtoLink.ts` builds email link.
- `canShare.ts` checks `navigator.share` support.
- `useInviteActions.ts` coordinates runtime actions and feedback state.

This separation keeps the UI simple and makes the invitation flow easier to test.

## Data contract

The invitation module should consume a simple data object:

```ts
export interface InviteData {
  roomId: string;
  roomCode: string;
  inviteUrl: string;
  roomMode: 'p2p' | 'sfu';
}
```

The invite text builder should consume:

```ts
export interface InviteMessageInput {
  inviteUrl: string;
  roomCode: string;
  variant?: 'default' | 'sms' | 'email';
}
```

## Example invitation text generation

### Default

```text
Join my video call: {inviteUrl}
Room code: {roomCode}
```

### SMS

```text
Join my video call: {inviteUrl}
Code: {roomCode}
```

### Email

```text
A video room is ready.
Join here: {inviteUrl}
Room code: {roomCode}
```

## Runtime decision logic

The implementation must use deterministic fallback order.

### Pseudocode

```ts
if (navigator.share) {
  showShareButton();
}

showCopyButton();
showEmailButton();
showRoomCode();

if (isLikelyMobileDevice()) {
  showSmsButton();
}
```

### On Share click

```ts
try {
  await navigator.share({ title, text, url });
  setFeedback('Share dialog opened successfully.');
} catch (err) {
  if (isAbortError(err)) {
    clearFeedback();
  } else {
    setFeedback('Sharing is unavailable. Copy the link instead.');
  }
}
```

### On Copy click

```ts
try {
  await navigator.clipboard.writeText(inviteUrl);
  setFeedback('Link copied.');
} catch {
  setFeedback('Copy failed. Select and copy the link manually.');
}
```

## Error handling requirements

The invitation system must handle failures without blocking the call flow.

### Cases to handle

- `navigator.share` unavailable;
- `navigator.share` cancelled by user;
- clipboard API unavailable or rejected;
- SMS link not supported by device;
- email client not configured;
- malformed invite URL;
- missing room code.

### Error handling rules

- Never break the room screen because an invitation action failed.
- Always keep at least one manual method visible.
- Prefer inline helper messages over modal errors.
- Cancellation is not an error.

## Analytics and telemetry

The invitation feature should be instrumented lightly.

### Trackable events

- `invite_panel_viewed`
- `invite_share_clicked`
- `invite_sms_clicked`
- `invite_email_clicked`
- `invite_copy_clicked`
- `invite_copy_succeeded`
- `invite_copy_failed`
- `invite_share_failed`

The MVP does not need user-level attribution. Event logging can remain anonymous.

## Testing requirements

The programming agent must cover the invitation flow with both unit and manual tests.

### Unit tests

Test these utilities:

- `buildInviteUrl`
- `buildInviteMessage`
- `buildSmsLink`
- `buildMailtoLink`
- feature-detection helpers

### UI tests

Verify:

- room URL is visible;
- room code is visible;
- Share button only appears when supported;
- Copy button always appears;
- feedback messages render correctly.

### Manual QA matrix

| Platform | Browser | Expected result |
|---|---|---|
| Windows 11 | Chrome | Copy + Email work; Share may vary by browser support [cite:35] |
| Windows 11 | Edge | Copy + Email work; Share depends on browser support [cite:35] |
| Android | Chrome | Share + SMS + Copy expected [cite:34][cite:35] |
| iPhone | Safari | Share expected; SMS behavior must be verified carefully [cite:34][cite:45] |
| macOS | Safari | Share support may exist; Copy + Email must always work [cite:35] |

## Security and privacy requirements

The invitation feature must avoid leaking unnecessary data.

### Rules

- invitation text must contain only room URL and room code;
- do not include internal participant identifiers;
- do not include backend tokens in the visible URL;
- do not embed temporary authentication secrets in the share text;
- if future tokenized invite links are added, they must be short-lived.

For the current MVP, the simplest safe pattern is a plain room URL and optional room code.

## Future extensions

The architecture should allow future addition of:

- backend SMS providers such as Twilio;
- email provider integration;
- QR code generation for nearby-device joining;
- “call me now” flow via SIP/PSTN bridge;
- push notification invites;
- contact picker support;
- expiring invite links.

These are explicitly outside MVP scope but should not be blocked by the design.

## Implementation summary for the programming agent

The programming agent must implement the invitation feature as follows:

1. Add a dedicated `InvitePanel` to the room flow.
2. Always display room URL and room code.
3. Implement `Copy link` as mandatory universal fallback.
4. Implement `Email` as always-available fallback.
5. Implement `Share` using Web Share API when supported [cite:34][cite:35].
6. Implement `SMS` as an optional mobile shortcut using `sms:` deep links [cite:39][cite:45].
7. Add inline success/error feedback.
8. Keep all invitation logic isolated in small utility files.
9. Ensure the room experience remains usable even if all enhanced share methods fail.

The invitation feature must remain simple, robust, and platform-tolerant. The room owner must always have at least one working way to notify the second participant.
