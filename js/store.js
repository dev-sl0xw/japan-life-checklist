// store.js — localStorage 래퍼. Stop #1 구현.
// 책임: capability probe(degraded mode), safeSet(quota error), profile/checked 영속,
//        멀티탭 storage event 머지(per-key merge), 충돌 정책(boolean LWW).

export const STORAGE_PREFIX = 'jlc:';

export const KEYS = {
  schemaVersion: 'jlc:schema_version',
  profile:       'jlc:profile',
  checked:       'jlc:checked',
  notes:         'jlc:notes',
  view:          'jlc:view',
};

let storageOK = null;

export function isStorageAvailable() {
  if (storageOK !== null) return storageOK;
  try {
    const probe = '__jlc_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    storageOK = true;
  } catch {
    storageOK = false;
  }
  return storageOK;
}

// degraded mode(시크릿/in-app 브라우저)에서는 세션 메모리로 폴백.
const memFallback = new Map();

export function safeSet(key, value) {
  const serialized = JSON.stringify(value);
  if (!isStorageAvailable()) {
    memFallback.set(key, serialized);
    return { ok: true, degraded: true };
  }
  let prev = null;
  try {
    prev = localStorage.getItem(key);
    localStorage.setItem(key, serialized);
    return { ok: true };
  } catch (err) {
    // QuotaExceededError 등: 이전 값 복원 후 실패 보고.
    try { if (prev !== null) localStorage.setItem(key, prev); } catch { /* noop */ }
    return { ok: false, error: err };
  }
}

export function safeGet(key, fallback = null) {
  if (!isStorageAvailable()) {
    const raw = memFallback.get(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// ── profile ──────────────────────────────────────────────
export function getProfile() {
  return safeGet(KEYS.profile, {}) || {};
}

export function setProfileFlag(flagId, value) {
  const profile = getProfile();
  profile[flagId] = value === true;
  return safeSet(KEYS.profile, profile);
}

// ── checked ──────────────────────────────────────────────
export function getChecked() {
  return safeGet(KEYS.checked, {}) || {};
}

// per-key merge: 변경된 item.id만 patch (전체 객체 교체 금지).
export function setChecked(itemId, value) {
  const checked = getChecked();
  if (value === true) checked[itemId] = true;
  else delete checked[itemId];
  return safeSet(KEYS.checked, checked);
}

// ── 멀티탭 동기화 ─────────────────────────────────────────
// 다른 탭의 jlc:* 변경을 감지. boolean 키(profile/checked)는 LWW로 단순 재적용.
export function onCrossTabChange(callback) {
  if (!isStorageAvailable()) return () => {};
  const handler = (e) => {
    if (!e.key || !e.key.startsWith(STORAGE_PREFIX)) return;
    callback(e.key);
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
