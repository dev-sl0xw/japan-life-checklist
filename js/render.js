// render.js — 도메인 뷰 렌더러. Stop #1 구현.
// 원칙: textContent only(XSS 방지), 색+텍스트 동반(접근성), aria 상태, ko/ja lang 분리.
// 풀 rerender 대신 섹션 단위 재생성(Stop #3에서 DOM 재활용 최적화 예정).

import { isVisibleWithAncestors, isVisible } from './filter.js';

const RISK_META = {
  legal_deadline:       { ko: '법정기한', mark: '🟥', cls: 'jlc-risk-legal' },
  money_loss:           { ko: '금전손실', mark: '🟧', cls: 'jlc-risk-money' },
  service_interruption: { ko: '서비스중단', mark: '🟨', cls: 'jlc-risk-service' },
  convenience:          { ko: '편의',     mark: '⬜', cls: 'jlc-risk-convenience' },
};

function timelineLabel(item) {
  if (item.timeline == null) return null;
  const off = item.timeline_offset_days;
  let suffix = '';
  if (typeof off === 'number') {
    if (off === 0) suffix = 'D-Day';
    else if (off < 0) suffix = `${Math.abs(off)}일 전`;
    else suffix = `${off}일 후`;
  }
  return suffix ? `${item.timeline} · ${suffix}` : item.timeline;
}

function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text != null) node.textContent = opts.text;
  if (opts.lang) node.setAttribute('lang', opts.lang);
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}

// ── My Profile 패널 ───────────────────────────────────────
export function renderProfile(panelEl, flags, profile, onToggle) {
  if (!panelEl) return;
  panelEl.textContent = '';
  for (const flag of flags) {
    const on = profile?.[flag.id] === true;
    const btn = el('button', {
      class: 'jlc-flag' + (on ? ' jlc-flag-on' : ''),
      attrs: { type: 'button', 'aria-pressed': String(on), 'data-flag': flag.id },
    });
    const ko = el('span', { class: 'jlc-flag-ko', text: flag.label_ko, lang: 'ko' });
    btn.appendChild(ko);
    if (flag.label_ja) {
      btn.appendChild(el('span', { class: 'jlc-flag-ja', text: flag.label_ja, lang: 'ja' }));
    }
    btn.addEventListener('click', () => onToggle(flag.id, !on));
    panelEl.appendChild(btn);
  }
}

// ── 항목 카드 ─────────────────────────────────────────────
function renderItem(item, checked, onCheck) {
  const card = el('li', { class: 'jlc-card', attrs: { 'data-item-id': item.id } });

  const top = el('label', { class: 'jlc-card-top' });
  const box = el('input', { attrs: { type: 'checkbox' } });
  box.checked = checked?.[item.id] === true;
  box.addEventListener('change', () => onCheck(item.id, box.checked));
  top.appendChild(box);

  const titleWrap = el('span', { class: 'jlc-card-titles' });
  titleWrap.appendChild(el('span', { class: 'jlc-card-ko', text: item.title_ko, lang: 'ko' }));
  if (item.title_ja) {
    titleWrap.appendChild(el('span', { class: 'jlc-card-ja', text: item.title_ja, lang: 'ja' }));
  }
  top.appendChild(titleWrap);
  card.appendChild(top);

  // 메타 chip 줄: risk_level + timeline (색 + 텍스트 항상 동반)
  const meta = el('div', { class: 'jlc-card-meta' });
  const rm = RISK_META[item.risk_level] || RISK_META.convenience;
  meta.appendChild(el('span', {
    class: `jlc-chip ${rm.cls}`,
    text: `${rm.mark} ${rm.ko}`,
    attrs: { 'aria-label': `위험도: ${rm.ko}` },
  }));
  const tl = timelineLabel(item);
  if (tl) {
    meta.appendChild(el('span', {
      class: 'jlc-chip jlc-chip-timeline',
      text: `🕒 ${tl}`,
      attrs: { 'aria-label': `시점: ${tl}` },
    }));
  }
  if (item.needs_verification === true) {
    meta.appendChild(el('span', { class: 'jlc-chip jlc-chip-verify', text: '⚠ 확인 필요' }));
  }
  card.appendChild(meta);

  if (item.description_ko) {
    card.appendChild(el('p', { class: 'jlc-card-desc', text: item.description_ko, lang: 'ko' }));
  }

  // 공식 출처 — textContent only, https 강제, rel/target 고정
  if (Array.isArray(item.sources) && item.sources.length > 0) {
    const src = el('div', { class: 'jlc-card-sources' });
    src.appendChild(el('span', { class: 'jlc-src-label', text: '공식 출처:' }));
    for (const s of item.sources) {
      if (!/^https:\/\//.test(s.url || '')) continue;
      const a = el('a', {
        class: 'jlc-src-link',
        text: s.label_ko || s.publisher || s.url,
        attrs: { href: s.url, target: '_blank', rel: 'noopener noreferrer' },
      });
      src.appendChild(a);
    }
    card.appendChild(src);
  }

  return card;
}

// ── 체크리스트 본문 ───────────────────────────────────────
export function renderChecklist(rootEl, data, profile, checked, onCheck) {
  if (!rootEl) return;
  rootEl.textContent = '';

  let visibleCount = 0;
  let anyCategoryVisible = false;

  for (const cat of data.categories || []) {
    if (!isVisible(cat.visible_when, profile)) continue;

    // 이 카테고리에서 실제로 보일 항목이 있는지 먼저 검사
    const visibleSubs = [];
    for (const sub of cat.subcategories || []) {
      const items = (sub.items || []).filter(it =>
        isVisibleWithAncestors(it, sub, cat, profile));
      if (items.length > 0) visibleSubs.push({ sub, items });
    }
    if (visibleSubs.length === 0) continue;

    anyCategoryVisible = true;
    const section = el('section', { class: 'jlc-cat', attrs: { 'aria-label': cat.label_ko } });

    const head = el('h3', { class: 'jlc-cat-head' });
    head.appendChild(el('span', { text: `${cat.icon || ''} ${cat.label_ko}`.trim(), lang: 'ko' }));
    if (cat.label_ja) head.appendChild(el('span', { class: 'jlc-cat-ja', text: cat.label_ja, lang: 'ja' }));
    section.appendChild(head);

    for (const { sub, items } of visibleSubs) {
      const subWrap = el('div', { class: 'jlc-sub' });
      const subHead = el('h4', { class: 'jlc-sub-head' });
      subHead.appendChild(el('span', { text: sub.label_ko, lang: 'ko' }));
      if (sub.label_ja) subHead.appendChild(el('span', { class: 'jlc-sub-ja', text: sub.label_ja, lang: 'ja' }));
      subWrap.appendChild(subHead);

      const ul = el('ul', { class: 'jlc-card-list' });
      for (const it of items) {
        ul.appendChild(renderItem(it, checked, onCheck));
        visibleCount++;
      }
      subWrap.appendChild(ul);
      section.appendChild(subWrap);
    }
    rootEl.appendChild(section);
  }

  if (!anyCategoryVisible) {
    rootEl.appendChild(el('p', {
      class: 'jlc-empty',
      text: '표시할 항목이 없습니다. 위 「내 상황」에서 해당하는 항목을 켜 주세요.',
    }));
  }
  return { visibleCount };
}

// 보이는 항목 기준 진행률
export function computeProgress(data, profile, checked) {
  let total = 0, done = 0;
  for (const cat of data.categories || []) {
    for (const sub of cat.subcategories || []) {
      for (const it of sub.items || []) {
        if (!isVisibleWithAncestors(it, sub, cat, profile)) continue;
        total++;
        if (checked?.[it.id] === true) done++;
      }
    }
  }
  return { total, done };
}
