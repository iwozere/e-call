export function buildSmsLink(body: string): string {
  return `sms:?&body=${encodeURIComponent(body)}`;
}
