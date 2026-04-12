export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (typeof err === 'object' &&
      err !== null &&
      'name' in err &&
      (err as { name?: string }).name === 'AbortError')
  );
}
