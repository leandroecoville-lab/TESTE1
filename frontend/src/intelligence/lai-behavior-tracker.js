// ══════════════════════════════════════════════════════════════
// LAI BEHAVIOR TRACKER — Adicionar no frontend (Lovable)
// Cola este arquivo e importa no App principal.
// Captura: cliques, navegação, exports, copy/paste, rage clicks, idles
// © Leandro Castelo — Ecossistema LAI | 300 Franchising
// ══════════════════════════════════════════════════════════════

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'ses-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
let buffer = [];
let lastClick = { el: '', ts: 0, count: 0 };
let lastActivity = Date.now();
const FLUSH_INTERVAL = 5000; // 5s
const IDLE_THRESHOLD = 60000; // 60s
const RAGE_THRESHOLD = 5; // 5 clicks in 3s
const MAX_BUFFER_SIZE = 500; // Fix #58: prevent unbounded growth
// AbortController for cleanup — call window.__laiBehaviorTrackerDestroy() to remove all listeners
const _trackerAC = new AbortController();
const _sig = { signal: _trackerAC.signal };

function getScreen() {
  return window.location.pathname + window.location.hash;
}

function getElement(e) {
  if (!e?.target) return '';
  const t = e.target;
  const tag = t.tagName?.toLowerCase() || '';
  const id = t.id ? `#${t.id}` : '';
  const cls = t.className && typeof t.className === 'string' ? `.${t.className.split(' ')[0]}` : '';
  const text = (t.textContent || '').slice(0, 30).trim();
  return `${tag}${id}${cls}${text ? `[${text}]` : ''}`;
}

function track(eventType, element, metadata = {}) {
  if (buffer.length >= MAX_BUFFER_SIZE) buffer.splice(0, 100); // Drop oldest 100 if full
  buffer.push({
    session_id: sessionId,
    event_type: eventType,
    screen: getScreen(),
    element: element || null,
    metadata,
    timestamp: new Date().toISOString(),
  });
  lastActivity = Date.now();
}

// ── Click tracking + rage click detection ──
document.addEventListener('click', (e) => {
  const el = getElement(e);
  const now = Date.now();

  if (el === lastClick.el && now - lastClick.ts < 3000) {
    lastClick.count++;
    if (lastClick.count >= RAGE_THRESHOLD) {
      track('rage_click', el, { count: lastClick.count, window_ms: now - lastClick.ts });
    }
  } else {
    lastClick = { el, ts: now, count: 1 };
  }

  track('click', el, { x: e.clientX, y: e.clientY });
}, { passive: true, signal: _trackerAC.signal });

// ── Navigation tracking ──
let currentPath = getScreen();
const checkNav = () => {
  const newPath = getScreen();
  if (newPath !== currentPath) {
    track('navigate', null, { from: currentPath, to: newPath });
    currentPath = newPath;
  }
};
setInterval(checkNav, 500);
window.addEventListener('popstate', checkNav, _sig);

// ── Copy/Paste tracking ──
document.addEventListener('copy', () => {
  track('copy', null, { text_length: (window.getSelection()?.toString() || '').length });
}, { passive: true, signal: _trackerAC.signal });

document.addEventListener('paste', () => {
  track('paste', null, {});
}, { passive: true, signal: _trackerAC.signal });

// ── Export detection (download links) ──
document.addEventListener('click', (e) => {
  const a = e.target?.closest?.('a[download], a[href*=".csv"], a[href*=".xlsx"], a[href*="export"]');
  if (a) {
    track('export', getElement(e), { href: a.href?.slice(0, 100) || '', download: a.download || '' });
  }
  const btn = e.target?.closest?.('button');
  if (btn) {
    const text = (btn.textContent || '').toLowerCase();
    if (text.includes('export') || text.includes('download') || text.includes('excel') || text.includes('csv')) {
      track('export', getElement(e), { button_text: text.slice(0, 50) });
    }
  }
}, { passive: true, signal: _trackerAC.signal });

// ── Input tracking (field focus/blur) ──
document.addEventListener('focusin', (e) => {
  if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA' || e.target?.tagName === 'SELECT') {
    track('focus', getElement(e), { input_name: e.target?.name || e.target?.id || '' });
  }
}, { passive: true, signal: _trackerAC.signal });

// ── Idle detection ──
setInterval(() => {
  if (Date.now() - lastActivity > IDLE_THRESHOLD) {
    track('idle', null, { idle_ms: Date.now() - lastActivity });
  }
}, IDLE_THRESHOLD);

// ── Search/Filter tracking ──
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t?.type === 'search' || t?.role === 'searchbox' || t?.placeholder?.toLowerCase().includes('buscar') || t?.placeholder?.toLowerCase().includes('search') || t?.placeholder?.toLowerCase().includes('filtrar')) {
    track('search', getElement(e), { query_length: (t.value || '').length });
  }
}, { passive: true, signal: _trackerAC.signal });

// ── Error tracking ──
window.addEventListener('error', (e) => {
  track('error', null, { message: e.message?.slice(0, 200) || '', filename: e.filename?.slice(-50) || '', line: e.lineno });
}, _sig);

window.addEventListener('unhandledrejection', (e) => {
  track('error', null, { message: String(e.reason)?.slice(0, 200) || 'unhandled_promise', type: 'promise' });
}, _sig);

// ── Flush buffer to Supabase ──
async function flush() {
  if (!buffer.length || !SUPABASE_URL || !SUPABASE_KEY) return;

  const events = [...buffer];
  buffer = [];

  // Get tenant_id and user_id from Supabase session
  let tenantId = null;
  let userId = null;
  try {
    const sbHost = new URL(SUPABASE_URL).hostname.split('.')[0];
    const sessionStr = typeof localStorage !== 'undefined' ? localStorage.getItem('sb-' + sbHost + '-auth-token') : null;
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      userId = session?.user?.id || null;
      tenantId = session?.user?.user_metadata?.tenant_id || session?.user?.app_metadata?.tenant_id || null;
    }
  } catch (e) { /* localStorage unavailable (private browsing/iframe) */ }

  const enriched = events.map(e => ({
    ...e,
    tenant_id: tenantId || '00000000-0000-0000-0000-000000000000',
    user_id: userId || '00000000-0000-0000-0000-000000000000',
  }));

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/user_behavior_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(enriched),
    });
  } catch (err) {
    // Re-add to buffer on failure
    buffer.push(...events);
    console.warn('[LAI Tracker] Flush failed, will retry:', err.message);
  }
}

setInterval(flush, FLUSH_INTERVAL);
window.addEventListener('beforeunload', flush, _sig);

// ── Public API ──
window.__LAI_TRACKER = {
  track,
  flush,
  getSessionId: () => sessionId,
  getBuffer: () => buffer,
  resetSession: () => { sessionId = crypto.randomUUID(); },
};

console.log('[LAI Tracker] Active. Session:', sessionId.slice(0, 8));

// ── Cleanup ──
window.__laiBehaviorTrackerDestroy = function() {
  _trackerAC.abort();
  clearInterval(flushTimer);
  flush(); // Send remaining events
  console.log('[LAI Tracker] Destroyed');
};
