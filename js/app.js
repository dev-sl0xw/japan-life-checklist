// app.js — 부트스트랩 + 이벤트 배선. Stop #1~#3 구현.

// NOTE: 모든 모듈 import에 ?v=<버전> 쿼리를 부착(캐시 버스팅).
// 코드/콘텐츠 release 시 index.html·app.js·filter.js의 버전 문자열을 함께 올린다.
import {
  isStorageAvailable, getProfile, setProfileFlag, setProfileAll,
  getChecked, setChecked, getNotes, setNote, getView, setView,
  getAnchors, setAnchor, getRegion, setRegion,
  exportData, importData, clearAll, onCrossTabChange,
} from './store.js?v=2026-05-30b';
import { validateRuntime } from './validate.js?v=2026-05-30b';
import {
  flattenVisible, buildSearchIndex, matchesSearch, matchesStatus, matchesRisk,
} from './filter.js?v=2026-05-30b';
import { renderProfile, renderChecklist } from './render.js?v=2026-05-30b';

const APP_SCHEMA_VERSION = 1;

const $ = (id) => document.getElementById(id);

const state = {
  data: null, profile: {}, checked: {}, notes: {},
  view: { mode: 'domain', status: 'all', risk: 'all', search: '' },
  anchors: { move: null, job: null }, region: { pref: 'tokyo', city: null },
  index: null, today: new Date(),
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
  const node = $('progress-display');
  if (node) node.textContent = total === 0 ? '해당 항목 없음'
    : `진행률 ${done} / ${total} (${Math.round((done / total) * 100)}%)`;
}

function rerenderList() {
  const entries = filteredEntries();
  const totalVisible = profileVisible().length;
  let emptyReason = '표시할 항목이 없습니다.';
  if (totalVisible === 0) emptyReason = '위 「내 상황」에서 해당하는 항목을 켜 주세요.';
  else if (entries.length === 0) emptyReason = '검색·필터 조건에 맞는 항목이 없습니다.';

  renderChecklist($('categories-root'), {
    entries, mode: state.view.mode, checked: state.checked, notes: state.notes,
    today: state.today, anchors: state.anchors, region: state.region,
    regionResources: state.data.region_resources || {}, regionLabel: regionLabel(state.region),
    onCheck, onNote: onNoteDebounced, emptyReason,
  });

  const rc = $('result-count');
  if (rc) rc.textContent = totalVisible === 0 ? '' : `표시 ${entries.length}개 / 해당 ${totalVisible}개`;
}

// ── 핸들러 ───────────────────────────────────────────────
function onToggle(flagId, value) {
  state.profile[flagId] = value;
  setProfileFlag(flagId, value);
  renderProfile($('profile-flags'), state.data.profile_flags, state.profile, onToggle);
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
  if (summaryEl) summaryEl.textContent = (value && value.trim()) ? '📝 메모 (작성됨)' : '📝 메모';
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
    if (!res.ok) { banner(`가져오기 실패: ${res.errors.join(', ')}`, 'error'); return; }
    state.profile = getProfile(); state.checked = getChecked(); state.notes = getNotes();
    state.anchors = getAnchors(); state.region = getRegion();
    renderProfile($('profile-flags'), state.data.profile_flags, state.profile, onToggle);
    populateRegions(); syncControlsFromView(); refreshProgress();
    const extra = res.orphanCount ? ` (소속 잃은 기록 ${res.orphanCount}개 보관)` : '';
    const warn = res.errors.length ? ` · ${res.errors.join(', ')}` : '';
    banner(`가져오기 완료${extra}${warn}`, res.errors.length ? 'warn' : 'info');
  };
  reader.onerror = () => banner('파일을 읽을 수 없습니다.', 'error');
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

function doReset() {
  if (!confirm('체크·메모·내 상황 설정을 모두 삭제합니다. 계속할까요? (이 작업은 되돌릴 수 없습니다)')) return;
  clearAll();
  state.profile = {}; state.checked = {}; state.notes = {};
  state.view = { mode: 'domain', status: 'all', risk: 'all', search: '' };
  state.anchors = { move: null, job: null }; state.region = { pref: 'tokyo', city: null };
  $('filter-status').value = 'all'; $('filter-risk').value = 'all'; $('search-input').value = '';
  $('anchor-move').value = ''; $('anchor-job').value = '';
  $('region-select').value = 'tokyo'; populateCities();
  setMode('domain');
  renderProfile($('profile-flags'), state.data.profile_flags, state.profile, onToggle);
  rerenderList(); refreshProgress();
  banner('초기화되었습니다.', 'info');
}

function wireControls() {
  $('view-domain').addEventListener('click', () => setMode('domain'));
  $('view-timeline').addEventListener('click', () => setMode('timeline'));
  $('filter-status').addEventListener('change', (e) => { state.view.status = e.target.value; setView({ status: e.target.value }); rerenderList(); });
  $('filter-risk').addEventListener('change', (e) => { state.view.risk = e.target.value; setView({ risk: e.target.value }); rerenderList(); });
  $('search-input').addEventListener('input', (e) => onSearch(e.target.value));
  $('btn-profile-clear').addEventListener('click', () => {
    setProfileAll(state.data.profile_flags.map(f => f.id), false);
    state.profile = getProfile();
    renderProfile($('profile-flags'), state.data.profile_flags, state.profile, onToggle);
    rerenderList(); refreshProgress();
  });
  $('btn-export').addEventListener('click', doExport);
  $('import-file').addEventListener('change', (e) => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; });
  $('btn-reset').addEventListener('click', doReset);
  // 기준일
  $('anchor-move').addEventListener('change', (e) => { state.anchors.move = e.target.value || null; setAnchor('move', e.target.value); rerenderList(); });
  $('anchor-job').addEventListener('change', (e) => { state.anchors.job = e.target.value || null; setAnchor('job', e.target.value); rerenderList(); });
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
  none.value = ''; none.textContent = '(구/시 전체)';
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
  if (!isStorageAvailable()) {
    banner('이 브라우저에서는 진행 상황이 저장되지 않습니다. 「내보내기」로 백업하세요.', 'warn');
  }

  let data;
  try {
    const res = await fetch('./data/items.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    if ($('data-version-display')) $('data-version-display').textContent = `데이터 로드 실패: ${err.message}`;
    banner('최신 데이터를 확인할 수 없습니다. 표시 내용이 오래되었을 수 있습니다.', 'warn');
    console.error('[jlc] items.json load failed', err);
    return;
  }

  const errors = validateRuntime(data);
  if (errors.length > 0) {
    if ($('data-version-display')) $('data-version-display').textContent = '데이터 검증 실패';
    banner(`데이터 형식 오류: ${errors[0]}`, 'error');
    console.error('[jlc] validation errors', errors);
    return;
  }

  if (typeof data.schema_version === 'number' && data.schema_version > APP_SCHEMA_VERSION) {
    banner('콘텐츠 스키마가 현재 앱보다 최신입니다. 페이지를 새로고침 해 주세요.', 'warn');
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
    $('data-version-display').textContent = `데이터 기준일: ${data.data_version} · schema v${data.schema_version}`;
  }

  renderProfile($('profile-flags'), data.profile_flags, state.profile, onToggle);
  wireControls();
  populateRegions();
  syncControlsFromView();   // setMode 내부에서 rerenderList 호출
  refreshProgress();

  onCrossTabChange((key) => {
    if (key === 'jlc:profile') { state.profile = getProfile(); renderProfile($('profile-flags'), data.profile_flags, state.profile, onToggle); rerenderList(); refreshProgress(); }
    else if (key === 'jlc:checked') { state.checked = getChecked(); rerenderList(); refreshProgress(); }
    else if (key === 'jlc:notes') { state.notes = getNotes(); rerenderList(); }
  });
}

boot();
