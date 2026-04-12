export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
