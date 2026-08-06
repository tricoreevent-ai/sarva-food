export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15_000) {
  const timeout = AbortSignal.timeout(timeoutMs); const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try { return await fetch(input, { ...init, signal }); }
  catch (error) { if (timeout.aborted) throw new Error("The request timed out. Check your connection and retry."); throw error; }
}
