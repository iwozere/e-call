/** True when the async clipboard API is likely available (still may reject at runtime). */
export function canUseClipboard(): boolean {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  if (typeof window !== 'undefined' && window.isSecureContext === false) return false;
  return typeof navigator.clipboard.writeText === 'function';
}
