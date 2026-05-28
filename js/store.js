// store.js — localStorage 래퍼. Stop #1에서 본 구현.
// 책임: capability probe, safeSet (quota error 처리), schema migration, multi-tab storage event 머지.

export const STORAGE_PREFIX = 'jlc:';

export function isStorageAvailable() {
  try {
    const probe = '__jlc_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function safeSet(key, value) {
  // Stop #1에서 quota error 처리 및 per-key merge 로직 추가
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export function safeGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
