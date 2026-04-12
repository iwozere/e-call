export function buildInviteUrl(roomId: string, origin?: string): string {
  const base =
    origin ??
    (typeof globalThis !== 'undefined' && 'location' in globalThis && globalThis.location
      ? globalThis.location.origin
      : '');
  return `${base}/room/${encodeURIComponent(roomId)}`;
}
