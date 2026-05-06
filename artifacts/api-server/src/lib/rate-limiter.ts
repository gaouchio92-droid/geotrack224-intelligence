const _parsed = parseInt(process.env["INGEST_RATE_LIMIT_PER_MIN"] ?? "60", 10);
const RATE_LIMIT = Number.isFinite(_parsed) && _parsed > 0 ? _parsed : 60;
const WINDOW_MS = 60_000;

interface Window {
  count: number;
  windowStart: number;
}

const windows = new Map<number, Window>();

function getOrCreateWindow(tokenId: number): Window {
  const now = Date.now();
  let win = windows.get(tokenId);
  if (!win || now - win.windowStart >= WINDOW_MS) {
    win = { count: 0, windowStart: now };
    windows.set(tokenId, win);
  }
  return win;
}

export function checkRateLimit(tokenId: number): { allowed: boolean; remaining: number; limit: number } {
  const win = getOrCreateWindow(tokenId);
  if (win.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, limit: RATE_LIMIT };
  }
  win.count += 1;
  return { allowed: true, remaining: RATE_LIMIT - win.count, limit: RATE_LIMIT };
}

export function getRateLimitUsage(tokenId: number): { requestsThisMinute: number; limitPerMinute: number } {
  const now = Date.now();
  const win = windows.get(tokenId);
  if (!win || now - win.windowStart >= WINDOW_MS) {
    return { requestsThisMinute: 0, limitPerMinute: RATE_LIMIT };
  }
  return { requestsThisMinute: win.count, limitPerMinute: RATE_LIMIT };
}
