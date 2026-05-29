// store.js — localStorage 래퍼. Stop #1~#3 구현.
// 책임: capability probe(degraded mode), safeSet(quota error), profile/checked/notes/view 영속,
//        멀티탭 storage event 머지(per-key merge), export/import, 전체 초기화.

export const STORAGE_PREFIX = 'jlc:';

export const KEYS = {
  schemaVersion: 'jlc:schema_version',
  profile:       'jlc:profile',
  checked:       'jlc:checked',
  notes:         'jlc:notes',
  view:          'jlc:view',
  orphan:        'jlc:orphan',
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
export function getProfile() { return safeGet(KEYS.profile, {}) || {}; }
export function setProfileFlag(flagId, value) {
  const profile = getProfile();
  profile[flagId] = value === true;
  return safeSet(KEYS.profile, profile);
}
export function setProfileAll(flagIds, value) {
  const profile = getProfile();
  for (const id of flagIds) profile[id] = value === true;
  return safeSet(KEYS.profile, profile);
}

// ── checked (per-key merge) ──────────────────────────────
export function getChecked() { return safeGet(KEYS.checked, {}) || {}; }
export function setChecked(itemId, value) {
  const checked = getChecked();
  if (value === true) checked[itemId] = true;
  else delete checked[itemId];
  return safeSet(KEYS.checked, checked);
}

// ── notes ────────────────────────────────────────────────
export function getNotes() { return safeGet(KEYS.notes, {}) || {}; }
export function setNote(itemId, text) {
  const notes = getNotes();
  if (text && text.trim()) notes[itemId] = text;
  else delete notes[itemId];
  return safeSet(KEYS.notes, notes);
}

// ── view 상태 ────────────────────────────────────────────
const DEFAULT_VIEW = { mode: 'domain', status: 'all', risk: 'all', search: '' };
export function getView() { return { ...DEFAULT_VIEW, ...(safeGet(KEYS.view, {}) || {}) }; }
export function setView(patch) {
  const view = getView();
  return safeSet(KEYS.view, { ...view, ...patch });
}

// ── export / import ──────────────────────────────────────
export function exportData() {
  return {
    app: 'japan-life-checklist',
    exported_at: null, // 호출 측에서 채움(스크립트 환경 Date 제약 회피)
    schema_version: safeGet(KEYS.schemaVersion, 1),
    profile: getProfile(),
    checked: getChecked(),
    notes: getNotes(),
    view: getView(),
  };
}

const MAX_IMPORT_BYTES = 1024 * 1024;     // 1MB
const MAX_NOTE_BYTES   = 10 * 1024;       // 10KB/항목
const MAX_NOTES_TOTAL  = 500 * 1024;      // 500KB

// rawText: 파일 텍스트. knownItemIds: Set, knownFlags: Set. appSchemaVersion: number.
export function importData(rawText, { knownItemIds, knownFlags, appSchemaVersion }) {
  const errors = [];
  if (typeof rawText !== 'string') return { ok: false, errors: ['텍스트 아님'] };
  if (rawText.length > MAX_IMPORT_BYTES) return { ok: false, errors: ['파일이 너무 큽니다(1MB 초과)'] };

  let obj;
  try { obj = JSON.parse(rawText); }
  catch { return { ok: false, errors: ['JSON 파싱 실패'] }; }

  if (!obj || typeof obj !== 'object') return { ok: false, errors: ['형식 오류'] };
  if (typeof obj.schema_version !== 'number' || obj.schema_version > appSchemaVersion) {
    return { ok: false, errors: [`호환되지 않는 schema_version: ${obj.schema_version}`] };
  }

  // profile: 화이트리스트 flag만
  const profile = {};
  if (obj.profile && typeof obj.profile === 'object') {
    for (const [k, v] of Object.entries(obj.profile)) {
      if (knownFlags.has(k)) profile[k] = v === true;
    }
  }

  // checked: 알려진 item id만, 나머지는 orphan
  const checked = {}, orphanChecked = {};
  if (obj.checked && typeof obj.checked === 'object') {
    for (const [id, v] of Object.entries(obj.checked)) {
      if (v !== true) continue;
      if (knownItemIds.has(id)) checked[id] = true;
      else orphanChecked[id] = true;
    }
  }

  // notes: 크기 제한 + 알려진 id만(나머지 orphan)
  const notes = {}, orphanNotes = {};
  let notesTotal = 0;
  if (obj.notes && typeof obj.notes === 'object') {
    for (const [id, text] of Object.entries(obj.notes)) {
      if (typeof text !== 'string') continue;
      const bytes = new Blob([text]).size;
      if (bytes > MAX_NOTE_BYTES) { errors.push(`메모 ${id}: 10KB 초과로 건너뜀`); continue; }
      notesTotal += bytes;
      if (notesTotal > MAX_NOTES_TOTAL) { errors.push('메모 총량 500KB 초과로 일부 생략'); break; }
      if (knownItemIds.has(id)) notes[id] = text;
      else orphanNotes[id] = text;
    }
  }

  // 적용
  safeSet(KEYS.profile, profile);
  safeSet(KEYS.checked, checked);
  safeSet(KEYS.notes, notes);
  const orphanCount = Object.keys(orphanChecked).length + Object.keys(orphanNotes).length;
  if (orphanCount > 0) safeSet(KEYS.orphan, { checked: orphanChecked, notes: orphanNotes });

  return { ok: true, errors, orphanCount };
}

export function clearAll() {
  if (!isStorageAvailable()) { memFallback.clear(); return; }
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) toRemove.push(k);
  }
  for (const k of toRemove) localStorage.removeItem(k);
}

// ── 멀티탭 동기화 ─────────────────────────────────────────
export function onCrossTabChange(callback) {
  if (!isStorageAvailable()) return () => {};
  const handler = (e) => {
    if (!e.key || !e.key.startsWith(STORAGE_PREFIX)) return;
    callback(e.key);
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
