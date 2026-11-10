/** Fetch that gives up quickly so callers can use bundled data instead. */
export async function fetchOrUndefined(url: string, ms = 6000, signal?: AbortSignal): Promise<Response | undefined> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } catch {
    return undefined;
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
