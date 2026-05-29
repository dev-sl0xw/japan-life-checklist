// app.js — 부트스트랩 + 이벤트 배선. Stop #1 구현.

import {
  isStorageAvailable, getProfile, setProfileFlag,
  getChecked, setChecked, onCrossTabChange,
} from './store.js';
import { validateRuntime } from './validate.js';
import { renderProfile, renderChecklist, computeProgress } from './render.js';

const APP_SCHEMA_VERSION = 1;

const dom = {
  version:  () => document.getElementById('data-version-display'),
  profile:  () => document.getElementById('profile-flags'),
  root:     () => document.getElementById('categories-root'),
  banner:   () => document.getElementById('banner-region'),
  progress: () => document.getElementById('progress-display'),
};

const state = { data: null, profile: {}, checked: {} };

function banner(msg, kind = 'info') {
  const b = dom.banner();
  if (!b) return;
  b.textContent = '';
  if (!msg) return;
  const p = document.createElement('p');
  p.className = `jlc-banner jlc-banner-${kind}`;
  p.textContent = msg;
  b.appendChild(p);
}

function refreshProgress() {
  const node = dom.progress();
  if (!node) return;
  const { total, done } = computeProgress(state.data, state.profile, state.checked);
  node.textContent = total === 0
    ? '해당 항목 없음'
    : `진행률: ${done} / ${total} (${Math.round((done / total) * 100)}%)`;
}

function rerenderChecklist() {
  renderChecklist(dom.root(), state.data, state.profile, state.checked, onCheck);
  refreshProgress();
}

function onToggle(flagId, value) {
  state.profile[flagId] = value;
  setProfileFlag(flagId, value);
  // 토글 버튼 aria-pressed 갱신은 패널 재렌더로 처리
  renderProfile(dom.profile(), state.data.profile_flags, state.profile, onToggle);
  rerenderChecklist();
}

function onCheck(itemId, value) {
  if (value) state.checked[itemId] = true;
  else delete state.checked[itemId];
  setChecked(itemId, value);
  refreshProgress();
}

async function boot() {
  if (!isStorageAvailable()) {
    banner('이 브라우저에서는 진행 상황이 저장되지 않습니다. 나중에 JSON 내보내기로 백업하세요.', 'warn');
  }

  let data;
  try {
    const res = await fetch('./data/items.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    if (dom.version()) dom.version().textContent = `데이터 로드 실패: ${err.message}`;
    banner('최신 데이터를 확인할 수 없습니다. 표시 내용이 오래되었을 수 있습니다.', 'warn');
    console.error('[jlc] items.json load failed', err);
    return;
  }

  const errors = validateRuntime(data);
  if (errors.length > 0) {
    if (dom.version()) dom.version().textContent = '데이터 검증 실패';
    banner(`데이터 형식 오류: ${errors[0]}`, 'error');
    console.error('[jlc] validation errors', errors);
    return;
  }

  if (typeof data.schema_version === 'number' && data.schema_version > APP_SCHEMA_VERSION) {
    banner('콘텐츠 스키마가 현재 앱보다 최신입니다. 페이지를 새로고침 해 주세요.', 'warn');
  }

  state.data = data;
  state.profile = getProfile();
  state.checked = getChecked();

  if (dom.version()) {
    dom.version().textContent =
      `data_version: ${data.data_version} · schema: ${data.schema_version} · 확인일 ${data.data_version}`;
  }

  renderProfile(dom.profile(), data.profile_flags, state.profile, onToggle);
  rerenderChecklist();

  // 멀티탭 동기화: 다른 탭이 profile/checked를 바꾸면 다시 읽어 반영
  onCrossTabChange((key) => {
    if (key === 'jlc:profile') {
      state.profile = getProfile();
      renderProfile(dom.profile(), data.profile_flags, state.profile, onToggle);
      rerenderChecklist();
    } else if (key === 'jlc:checked') {
      state.checked = getChecked();
      rerenderChecklist();
    }
  });
}

boot();
