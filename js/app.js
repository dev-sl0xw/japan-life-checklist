// app.js — 부트스트랩 + 이벤트 배선. Stop #1~#3 구현.

// NOTE: 모든 모듈 import에 ?v=<버전> 쿼리를 부착(캐시 버스팅).
// 코드/콘텐츠 release 시 index.html·app.js·filter.js의 버전 문자열을 함께 올린다.
import {
  isStorageAvailable, getProfile, setProfileFlag, setProfileAll,
  getChecked, setChecked, getNotes, setNote, getView, setView,
  getAnchors, setAnchor, getRegion, setRegion, getLang, setLang,
  exportData, importData, clearAll, onCrossTabChange,
} from './store.js?v=2026-05-30e';
import { validateRuntime } from './validate.js?v=2026-05-30e';
import {
  flattenVisible, buildSearchIndex, matchesSearch, matchesStatus, matchesRisk,
} from './filter.js?v=2026-05-30e';
import { renderProfile, renderChecklist } from './render.js?v=2026-05-30e';
import { t, fmtProgress, fmtResultCount, fmtDataAsOf } from './strings.js?v=2026-05-30e';

const APP_SCHEMA_VERSION = 1;

const $ = (id) => document.getElementById(id);

const state = {
  data: null, profile: {}, checked: {}, notes: {},
  view: { mode: 'domain', status: 'all', risk: 'all', search: '' },
  anchors: { move: null, job: null }, region: { pref: 'tokyo', city: null },
  lang: 'ko', index: null, today: new Date(),
};

function prefEntry(pref) { return (state.data.regions || []).find(x => x.id === pref); }
function regionLabel(region) {
  const r = prefEntry(region.pref);
  if (!r) return region.pref;
  if (region.city) {
    const c = (r.cities || []).find(x => x.id === region.city);
    if (c) return `${r.label_ko} ${c.label_ko}`;
  }
  return r.label_ko;
}

function banner(msg, kind = 'info') {
  const b = $('banner-region');
  if (!b) return;
  b.textContent = '';
  if (!msg) return;
  const p = document.createElement('p');
  p.className = `jlc-banner jlc-banner-${kind}`;
  p.textContent = msg;
  b.appendChild(p);
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// YYYY-MM-DD 형식 + 실재하는 달력 날짜인지(예: 2026-02-31 거부)
function isRealDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// 기준일 입력 핸들러: 빈 값→해제, 유효한 YYYY-MM-DD→설정, 그 외(입력 중)→무시
function onAnchorInput(type, raw) {
  let v;
  if (raw === '') v = null;
  else if (isRealDate(raw)) v = raw;
  else { $(`anchor-${type}`).setCustomValidity(state.lang === 'ja' ? 'YYYY-MM-DD形式で入力' : 'YYYY-MM-DD 형식으로 입력'); return; }
  $(`anchor-${type}`).setCustomValidity('');
  state.anchors[type] = v;
  setAnchor(type, v || '');
  rerenderList();
}

// profile-visible 항목(필터 무관) — 진행률 기준
function profileVisible() { return flattenVisible(state.data, state.profile); }

// 필터(검색/상태/위험) 적용
function filteredEntries() {
  const { search, status, risk } = state.view;
  return profileVisible().filter(({ item }) =>
    matchesSearch(item, search, state.index) &&
    matchesStatus(item, state.checked, status) &&
    matchesRisk(item, risk));
}

function refreshProgress() {
  const vis = profileVisible();
  const total = vis.length;
  const done = vis.filter(({ item }) => state.checked[item.id] === true).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const node = $('progress-display');
  if (node) node.textContent = fmtProgress(state.lang, done, total);

  const bar = $('progress-bar');
  const fill = $('progress-fill');
  if (bar && fill) {
    bar.hidden = total === 0;
    bar.setAttribute('aria-valuenow', String(pct));
    bar.setAttribute('aria-label', fmtProgress(state.lang, done, total));
    fill.style.width = `${pct}%`;
    // 완료율 구간별 색상 (저→고): 빨강 → 주황 → 연두 → 초록
    const tier = pct === 100 ? 'is-done' : pct >= 67 ? 'is-high' : pct >= 34 ? 'is-mid' : 'is-low';
    fill.className = `jlc-progress-fill ${tier}`;
  }
}

function rerenderList() {
  const entries = filteredEntries();
  const totalVisible = profileVisible().length;
  let emptyReason = t(state.lang, 'empty.none');
  if (totalVisible === 0) emptyReason = t(state.lang, 'empty.noProfile');
  else if (entries.length === 0) emptyReason = t(state.lang, 'empty.noMatch');

  renderChecklist($('categories-root'), {
    entries, mode: state.view.mode, checked: state.checked, notes: state.notes,
    today: state.today, anchors: state.anchors, region: state.region,
    regionResources: state.data.region_resources || {}, regionLabel: regionLabel(state.region),
    lang: state.lang, onCheck, onNote: onNoteDebounced, emptyReason,
  });

  const rc = $('result-count');
  if (rc) rc.textContent = totalVisible === 0 ? '' : fmtResultCount(state.lang, entries.length, totalVisible);
}

// ── 핸들러 ───────────────────────────────────────────────
function onToggle(flagId, value) {
  state.profile[flagId] = value;
  setProfileFlag(flagId, value);
  renderProfile($('profile-flags'), state.data.profile_flags, state.profile, state.lang, onToggle);
  rerenderList();
  refreshProgress();
}

function onCheck(itemId, value) {
  if (value) state.checked[itemId] = true; else delete state.checked[itemId];
  setChecked(itemId, value);
  refreshProgress();
  // 미완료/완료 필터 중이면 목록 갱신
  if (state.view.status !== 'all') rerenderList();
}

function onNote(itemId, value, summaryEl) {
  if (value && value.trim()) state.notes[itemId] = value; else delete state.notes[itemId];
  setNote(itemId, value);
  if (summaryEl) summaryEl.textContent = (value && value.trim()) ? t(state.lang, 'card.memoDone') : t(state.lang, 'card.memo');
}
const onNoteDebounced = debounce(onNote, 200);

const onSearch = debounce((v) => { state.view.search = v; setView({ search: v }); rerenderList(); }, 150);

function setMode(mode) {
  state.view.mode = mode; setView({ mode });
  $('view-domain').setAttribute('aria-pressed', String(mode === 'domain'));
  $('view-timeline').setAttribute('aria-pressed', String(mode === 'timeline'));
  $('view-domain').classList.toggle('jlc-seg-on', mode === 'domain');
  $('view-timeline').classList.toggle('jlc-seg-on', mode === 'timeline');
  rerenderList();
}

function doExport() {
  const payload = exportData();
  payload.exported_at = new Date().toISOString();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `japan-life-checklist-backup-${payload.exported_at.slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function doImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const knownItemIds = new Set(profileVisibleAllIds());
    const knownFlags = new Set(state.data.profile_flags.map(f => f.id));
    const knownRegions = new Set((state.data.regions || []).map(r => r.id));
    const res = importData(String(reader.result), { knownItemIds, knownFlags, knownRegions, appSchemaVersion: APP_SCHEMA_VERSION });
    const ja = state.lang === 'ja';
    if (!res.ok) { banner(`${ja ? 'インポート失敗' : '가져오기 실패'}: ${res.errors.join(', ')}`, 'error'); return; }
    state.profile = getProfile(); state.checked = getChecked(); state.notes = getNotes();
    state.anchors = getAnchors(); state.region = getRegion(); state.lang = getLang();
    applyStaticI18n(state.lang);
    renderProfile($('profile-flags'), state.data.profile_flags, state.profile, state.lang, onToggle);
    populateRegions(); syncControlsFromView(); refreshProgress();
    const extra = res.orphanCount ? (ja ? ` (孤立した記録 ${res.orphanCount}件を保管)` : ` (소속 잃은 기록 ${res.orphanCount}개 보관)`) : '';
    const warn = res.errors.length ? ` · ${res.errors.join(', ')}` : '';
    banner(`${ja ? 'インポート完了' : '가져오기 완료'}${extra}${warn}`, res.errors.length ? 'warn' : 'info');
  };
  reader.onerror = () => banner(state.lang === 'ja' ? 'ファイルを読み込めません。' : '파일을 읽을 수 없습니다.', 'error');
  reader.readAsText(file);
}

// 모든 item id (visible_when 무관) — import 검증용
function profileVisibleAllIds() {
  const ids = [];
  for (const cat of state.data.categories || [])
    for (const sub of cat.subcategories || [])
      for (const item of sub.items || []) ids.push(item.id);
  return ids;
}

// 전체 초기화 — 진행상황 포함 모든 jlc:* 삭제 (언어는 보존)
function doReset() {
  if (!confirm(t(state.lang, 'reset.confirm'))) return;
  const keepLang = state.lang;
  clearAll();
  state.profile = {}; state.checked = {}; state.notes = {};
  state.view = { mode: 'domain', status: 'all', risk: 'all', search: '' };
  state.anchors = { move: null, job: null }; state.region = { pref: 'tokyo', city: null };
  state.lang = keepLang; setLang(keepLang);
  resetSettingsControls();
  renderProfile($('profile-flags'), state.data.profile_flags, state.profile, state.lang, onToggle);
  rerenderList(); refreshProgress();
  banner(t(state.lang, 'reset.done'), 'info');
}

// 표시 설정만 초기화 — 날짜·지역·필터·검색·보기 (진행상황·프로필·언어는 보존)
function doSettingsReset() {
  state.view = { mode: 'domain', status: 'all', risk: 'all', search: '' };
  state.anchors = { move: null, job: null }; state.region = { pref: 'tokyo', city: null };
  setView(state.view); setAnchor('move', ''); setAnchor('job', ''); setRegion(state.region);
  resetSettingsControls();
  refreshProgress();
  banner(t(state.lang, 'settingsReset.done'), 'info');
}

function resetSettingsControls() {
  $('filter-status').value = 'all'; $('filter-risk').value = 'all'; $('search-input').value = '';
  $('anchor-move').value = ''; $('anchor-job').value = '';
  $('region-select').value = 'tokyo'; populateCities();
  setMode('domain');   // rerenderList 포함
}

// 정적 UI(헤더·툴바·옵션) 텍스트를 현재 언어로 적용
function applyStaticI18n(lang) {
  document.documentElement.lang = lang;
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(lang, node.getAttribute('data-i18n'));
  }
  for (const node of document.querySelectorAll('[data-i18n-ph]')) {
    node.setAttribute('placeholder', t(lang, node.getAttribute('data-i18n-ph')));
  }
  const langBtn = $('btn-lang');
  if (langBtn) { langBtn.textContent = t(lang, 'lang.toggle'); langBtn.setAttribute('aria-label', lang === 'ja' ? '한국어に切替' : '日本語로 전환'); }
  if (state.data && $('data-version-display')) {
    $('data-version-display').textContent = fmtDataAsOf(lang, state.data.data_version, state.data.schema_version);
  }
}

function toggleLang() {
  state.lang = state.lang === 'ko' ? 'ja' : 'ko';
  setLang(state.lang);
  applyStaticI18n(state.lang);
  populateCities();                 // (구/시 전체) 라벨 갱신
  renderProfile($('profile-flags'), state.data.profile_flags, state.profile, state.lang, onToggle);
  rerenderList(); refreshProgress();
}

function wireControls() {
  $('btn-lang').addEventListener('click', toggleLang);
  $('btn-settings-reset').addEventListener('click', doSettingsReset);
  $('view-domain').addEventListener('click', () => setMode('domain'));
  $('view-timeline').addEventListener('click', () => setMode('timeline'));
  $('filter-status').addEventListener('change', (e) => { state.view.status = e.target.value; setView({ status: e.target.value }); rerenderList(); });
  $('filter-risk').addEventListener('change', (e) => { state.view.risk = e.target.value; setView({ risk: e.target.value }); rerenderList(); });
  $('search-input').addEventListener('input', (e) => onSearch(e.target.value));
  $('btn-profile-clear').addEventListener('click', () => {
    setProfileAll(state.data.profile_flags.map(f => f.id), false);
    state.profile = getProfile();
    renderProfile($('profile-flags'), state.data.profile_flags, state.profile, state.lang, onToggle);
    rerenderList(); refreshProgress();
  });
  $('btn-export').addEventListener('click', doExport);
  $('import-file').addEventListener('change', (e) => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; });
  $('btn-reset').addEventListener('click', doReset);
  // 기준일 (YYYY-MM-DD 텍스트 입력) — blur(change) 시 형식·실재 날짜 검증
  $('anchor-move').addEventListener('change', (e) => onAnchorInput('move', e.target.value.trim()));
  $('anchor-job').addEventListener('change', (e) => onAnchorInput('job', e.target.value.trim()));
  // 지역 (도도부현 + 구/시)
  $('region-select').addEventListener('change', (e) => {
    state.region = { pref: e.target.value, city: null };
    setRegion(state.region); populateCities(); rerenderList();
  });
  $('city-select').addEventListener('change', (e) => {
    state.region = { pref: state.region.pref, city: e.target.value || null };
    setRegion(state.region); rerenderList();
  });
}

function populateRegions() {
  const sel = $('region-select');
  sel.textContent = '';
  for (const r of state.data.regions || []) {
    const o = document.createElement('option');
    o.value = r.id; o.textContent = `${r.label_ko} / ${r.label_ja}`;
    sel.appendChild(o);
  }
  sel.value = state.region.pref;
  populateCities();
}

// 선택된 도도부현에 cities가 있으면 구/시 select 노출, 없으면 숨김
function populateCities() {
  const sel = $('city-select');
  const r = prefEntry(state.region.pref);
  const cities = (r && r.cities) || [];
  sel.textContent = '';
  if (cities.length === 0) { sel.hidden = true; return; }
  sel.hidden = false;
  const none = document.createElement('option');
  none.value = ''; none.textContent = t(state.lang, 'tb.cityAll');
  sel.appendChild(none);
  for (const c of cities) {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = `${c.label_ko} / ${c.label_ja}`;
    sel.appendChild(o);
  }
  sel.value = state.region.city || '';
}

function syncControlsFromView() {
  $('filter-status').value = state.view.status;
  $('filter-risk').value = state.view.risk;
  $('search-input').value = state.view.search || '';
  $('anchor-move').value = state.anchors.move || '';
  $('anchor-job').value = state.anchors.job || '';
  setMode(state.view.mode);
}

async function boot() {
  state.lang = getLang();
  applyStaticI18n(state.lang);   // 데이터 로드 전이라도 정적 UI는 즉시 번역

  if (!isStorageAvailable()) {
    banner(t(state.lang, 'banner.noStorage'), 'warn');
  }

  let data;
  try {
    const res = await fetch('./data/items.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    if ($('data-version-display')) $('data-version-display').textContent = `data load failed: ${err.message}`;
    banner(t(state.lang, 'banner.loadFail'), 'warn');
    console.error('[jlc] items.json load failed', err);
    return;
  }

  const errors = validateRuntime(data);
  if (errors.length > 0) {
    if ($('data-version-display')) $('data-version-display').textContent = 'data validation failed';
    banner(`data error: ${errors[0]}`, 'error');
    console.error('[jlc] validation errors', errors);
    return;
  }

  if (typeof data.schema_version === 'number' && data.schema_version > APP_SCHEMA_VERSION) {
    banner(t(state.lang, 'banner.schemaAhead'), 'warn');
  }

  state.data = data;
  state.index = buildSearchIndex(data);
  state.profile = getProfile();
  state.checked = getChecked();
  state.notes = getNotes();
  state.view = getView();
  state.anchors = getAnchors();
  state.region = getRegion();

  if ($('data-version-display')) {
    $('data-version-display').textContent = fmtDataAsOf(state.lang, data.data_version, data.schema_version);
  }

  renderProfile($('profile-flags'), data.profile_flags, state.profile, state.lang, onToggle);
  wireControls();
  populateRegions();
  syncControlsFromView();   // setMode 내부에서 rerenderList 호출
  refreshProgress();

  onCrossTabChange((key) => {
    if (key === 'jlc:profile') { state.profile = getProfile(); renderProfile($('profile-flags'), data.profile_flags, state.profile, state.lang, onToggle); rerenderList(); refreshProgress(); }
    else if (key === 'jlc:checked') { state.checked = getChecked(); rerenderList(); refreshProgress(); }
    else if (key === 'jlc:notes') { state.notes = getNotes(); rerenderList(); }
  });
}

boot();
