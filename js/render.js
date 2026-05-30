// render.js — 도메인 뷰 / 타임라인 뷰 렌더러. 언어(lang) 인자 기반.
// 원칙: textContent only(XSS 방지), 색+텍스트 동반(접근성), aria 상태, 선택 언어=주/다른 언어=부.

import {
  t, fmtRelative, fmtCountdown, fmtVerifiedAgo, fmtRegionNote,
} from './strings.js?v=2026-05-30e';

const RISK_META = {
  legal_deadline:       { mark: '🟥', cls: 'jlc-risk-legal',       prio: 0 },
  money_loss:           { mark: '🟧', cls: 'jlc-risk-money',       prio: 1 },
  service_interruption: { mark: '🟨', cls: 'jlc-risk-service',     prio: 2 },
  convenience:          { mark: '⬜', cls: 'jlc-risk-convenience', prio: 3 },
};

function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text != null) node.textContent = opts.text;
  if (opts.lang) node.setAttribute('lang', opts.lang);
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}

const other = (lang) => (lang === 'ko' ? 'ja' : 'ko');
function field(obj, base, lang) { return obj?.[`${base}_${lang}`] || obj?.[`${base}_ko`] || ''; }

function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d; }
function ymd(d) { return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; }
function dayDiff(a, b) { return Math.round((a.getTime() - b.getTime()) / 86400000); }
function daysSince(dateStr, today) {
  if (!dateStr || !today) return null;
  const d = new Date(dateStr + 'T00:00:00Z').getTime();
  if (Number.isNaN(d)) return null;
  return Math.floor((today.getTime() - d) / 86400000);
}

// 기준일(anchor) 미설정 → 상대 라벨. 설정 → 실제 날짜 + 카운트다운 + 근접 색상.
function timelineChip(item, cat, anchors, today, lang) {
  if (item.timeline == null) return null;
  const off = item.timeline_offset_days;
  const anchorType = cat?.anchor;
  const anchorDate = anchorType && anchors ? anchors[anchorType] : null;

  if (!anchorDate || typeof off !== 'number') {
    const suffix = (typeof off === 'number') ? fmtRelative(lang, off) : '';
    const text = suffix ? `🕒 ${item.timeline} · ${suffix}` : `🕒 ${item.timeline}`;
    return { text, urgency: '', aria: text.replace('🕒 ', '') };
  }
  const itemDate = addDays(anchorDate, off);
  const du = dayDiff(itemDate, new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  const md = ymd(itemDate);
  let urgency;
  if (du < 0) urgency = 'jlc-u-overdue';
  else if (du <= 5) urgency = 'jlc-u-now';
  else if (du <= 14) urgency = 'jlc-u-soon';
  else if (du <= 30) urgency = 'jlc-u-near';
  else urgency = 'jlc-u-far';
  const count = fmtCountdown(lang, du);
  return { text: `📅 ${md} · ${count}`, urgency, aria: `${md}, ${count}` };
}

// 주 텍스트(선택 언어) + 부 텍스트(다른 언어)를 분리된 span으로
function bilingualInto(parent, obj, base, lang, primaryClass, secondaryClass) {
  const prim = field(obj, base, lang);
  parent.appendChild(el('span', { class: primaryClass, text: prim, lang }));
  const sec = obj?.[`${base}_${other(lang)}`];
  if (sec && sec !== prim) parent.appendChild(el('span', { class: secondaryClass, text: sec, lang: other(lang) }));
}

function linkText(ln, lang) {
  if (lang === 'ja') return ln.label_ja || ln.publisher || ln.label_ko || ln.url;
  return ln.label_ko || ln.publisher || ln.url;
}

// ── My Profile 패널 ───────────────────────────────────────
export function renderProfile(panelEl, flags, profile, lang, onToggle) {
  if (!panelEl) return;
  panelEl.textContent = '';
  for (const flag of flags) {
    // 준비중(coming_soon) 플래그 — 선택 불가, "준비중" 배지로 안내(v1.5 예정)
    if (flag.coming_soon === true) {
      const btn = el('button', {
        class: 'jlc-flag jlc-flag-soon',
        attrs: { type: 'button', disabled: 'disabled', 'aria-disabled': 'true', 'data-flag': flag.id },
      });
      const titles = el('span', { class: 'jlc-flag-titles' });
      bilingualInto(titles, flag, 'label', lang, 'jlc-flag-ko', 'jlc-flag-ja');
      btn.appendChild(titles);
      btn.appendChild(el('span', { class: 'jlc-flag-badge', text: t(lang, 'profile.comingSoon') }));
      panelEl.appendChild(btn);
      continue;
    }
    const on = profile?.[flag.id] === true;
    const btn = el('button', {
      class: 'jlc-flag' + (on ? ' jlc-flag-on' : ''),
      attrs: { type: 'button', 'aria-pressed': String(on), 'data-flag': flag.id },
    });
    bilingualInto(btn, flag, 'label', lang, 'jlc-flag-ko', 'jlc-flag-ja');
    btn.addEventListener('click', () => onToggle(flag.id, !on));
    panelEl.appendChild(btn);
  }
}

// ── 항목 카드 ─────────────────────────────────────────────
function renderItem(entry, ctx, { showDomain = false } = {}) {
  const { item, cat } = entry;
  const { checked, notes, today, anchors, region, regionResources, regionLabel, lang, onCheck, onNote } = ctx;
  const card = el('li', { class: 'jlc-card', attrs: { 'data-item-id': item.id } });

  const top = el('label', { class: 'jlc-card-top' });
  const box = el('input', { attrs: { type: 'checkbox' } });
  box.checked = checked?.[item.id] === true;
  box.addEventListener('change', () => onCheck(item.id, box.checked));
  top.appendChild(box);
  const titleWrap = el('span', { class: 'jlc-card-titles' });
  bilingualInto(titleWrap, item, 'title', lang, 'jlc-card-ko', 'jlc-card-ja');
  top.appendChild(titleWrap);
  card.appendChild(top);

  const meta = el('div', { class: 'jlc-card-meta' });
  if (showDomain) meta.appendChild(el('span', { class: 'jlc-chip jlc-chip-domain', text: `${cat.icon || ''} ${field(cat, 'label', lang)}`.trim() }));
  const rm = RISK_META[item.risk_level] || RISK_META.convenience;
  const riskLabel = t(lang, `risk.${item.risk_level}`) || t(lang, 'risk.convenience');
  meta.appendChild(el('span', { class: `jlc-chip ${rm.cls}`, text: `${rm.mark} ${riskLabel}`, attrs: { 'aria-label': riskLabel } }));
  const tl = timelineChip(item, cat, anchors, today, lang);
  if (tl) meta.appendChild(el('span', { class: `jlc-chip jlc-chip-timeline ${tl.urgency}`.trim(), text: tl.text, attrs: { 'aria-label': tl.aria } }));
  if (item.needs_verification === true) meta.appendChild(el('span', { class: 'jlc-chip jlc-chip-verify', text: t(lang, 'card.needsVerify') }));
  card.appendChild(meta);

  const desc = field(item, 'description', lang);
  if (desc) card.appendChild(el('p', { class: 'jlc-card-desc', text: desc, lang }));

  // 공식 출처 + 확인일
  if (Array.isArray(item.sources) && item.sources.length > 0) {
    const src = el('div', { class: 'jlc-card-sources' });
    src.appendChild(el('span', { class: 'jlc-src-label', text: t(lang, 'card.sources') }));
    for (const s of item.sources) {
      if (!/^https:\/\//.test(s.url || '')) continue;
      src.appendChild(el('a', { class: 'jlc-src-link', text: linkText(s, lang), attrs: { href: s.url, target: '_blank', rel: 'noopener noreferrer' } }));
    }
    const age = daysSince(item.last_verified, today);
    if (age != null) src.appendChild(el('span', { class: 'jlc-src-age', text: fmtVerifiedAgo(lang, age) }));
    card.appendChild(src);
  }

  // 바로가기 = 항목 links + 지역(region_key) 해결 링크
  const actionLinks = [];
  for (const ln of item.links || []) if (/^https:\/\//.test(ln.url || '')) actionLinks.push(ln);
  let regionFallbackNote = null;
  if (item.region_key && regionResources && regionResources[item.region_key]) {
    const byRegion = regionResources[item.region_key];
    const pref = region?.pref, city = region?.city;
    const resolved = (city && byRegion[`${pref}/${city}`]) || byRegion[pref] || byRegion._default || [];
    for (const ln of resolved) if (/^https:\/\//.test(ln.url || '')) actionLinks.push(ln);
    if (resolved.length === 0) regionFallbackNote = fmtRegionNote(lang, regionLabel);
  }
  if (actionLinks.length > 0) {
    const row = el('div', { class: 'jlc-card-actions' });
    row.appendChild(el('span', { class: 'jlc-action-label', text: t(lang, 'card.links') }));
    for (const ln of actionLinks) row.appendChild(el('a', { class: 'jlc-action-link', text: linkText(ln, lang), attrs: { href: ln.url, target: '_blank', rel: 'noopener noreferrer' } }));
    card.appendChild(row);
  }
  if (regionFallbackNote) card.appendChild(el('p', { class: 'jlc-region-note', text: regionFallbackNote }));

  // 메모 (사생활 — 인쇄 숨김)
  const details = el('details', { class: 'jlc-card-notes' });
  const summary = el('summary', { class: 'jlc-notes-summary' });
  const hasNote = !!(notes && notes[item.id]);
  summary.textContent = hasNote ? t(lang, 'card.memoDone') : t(lang, 'card.memo');
  details.appendChild(summary);
  const ta = el('textarea', { class: 'jlc-note-input', attrs: { rows: '2', 'aria-label': field(item, 'title', lang), placeholder: t(lang, 'card.memoPh') } });
  ta.value = (notes && notes[item.id]) || '';
  ta.addEventListener('input', () => onNote(item.id, ta.value, summary));
  details.appendChild(ta);
  card.appendChild(details);

  return card;
}

// ── 도메인 뷰 ─────────────────────────────────────────────
function renderDomain(rootEl, entries, ctx) {
  const lang = ctx.lang;
  const byCat = new Map();
  for (const e of entries) {
    if (!byCat.has(e.cat.id)) byCat.set(e.cat.id, { cat: e.cat, subs: new Map() });
    const c = byCat.get(e.cat.id);
    if (!c.subs.has(e.sub.id)) c.subs.set(e.sub.id, { sub: e.sub, items: [] });
    c.subs.get(e.sub.id).items.push(e);
  }
  for (const { cat, subs } of byCat.values()) {
    const section = el('section', { class: 'jlc-cat', attrs: { 'aria-label': field(cat, 'label', lang) } });
    const head = el('h3', { class: 'jlc-cat-head' });
    head.appendChild(el('span', { text: `${cat.icon || ''} ${field(cat, 'label', lang)}`.trim(), lang }));
    const catSec = cat[`label_${other(lang)}`];
    if (catSec) head.appendChild(el('span', { class: 'jlc-cat-ja', text: catSec, lang: other(lang) }));
    section.appendChild(head);
    for (const { sub, items } of subs.values()) {
      const subWrap = el('div', { class: 'jlc-sub' });
      const subHead = el('h4', { class: 'jlc-sub-head' });
      bilingualInto(subHead, sub, 'label', lang, 'jlc-sub-ko', 'jlc-sub-ja');
      subWrap.appendChild(subHead);
      const ul = el('ul', { class: 'jlc-card-list' });
      for (const e of items) ul.appendChild(renderItem(e, ctx, { showDomain: false }));
      subWrap.appendChild(ul);
      section.appendChild(subWrap);
    }
    rootEl.appendChild(section);
  }
}

// ── 타임라인 뷰 ───────────────────────────────────────────
function renderTimeline(rootEl, entries, ctx) {
  const lang = ctx.lang;
  const undated = lang === 'ja' ? '時期未定' : '시점 미정';
  const OFF_NULL = Number.POSITIVE_INFINITY;
  const sorted = [...entries].sort((a, b) => {
    const oa = a.item.timeline_offset_days ?? OFF_NULL;
    const ob = b.item.timeline_offset_days ?? OFF_NULL;
    if (oa !== ob) return oa - ob;
    const pa = (RISK_META[a.item.risk_level] || RISK_META.convenience).prio;
    const pb = (RISK_META[b.item.risk_level] || RISK_META.convenience).prio;
    if (pa !== pb) return pa - pb;
    if (a.cat.id !== b.cat.id) return a.cat.id < b.cat.id ? -1 : 1;
    if (a.sub.id !== b.sub.id) return a.sub.id < b.sub.id ? -1 : 1;
    return a.item.id < b.item.id ? -1 : 1;
  });
  const buckets = [];
  const idx = new Map();
  for (const e of sorted) {
    const key = e.item.timeline || undated;
    if (!idx.has(key)) { idx.set(key, buckets.length); buckets.push({ key, items: [] }); }
    buckets[idx.get(key)].items.push(e);
  }
  for (const bucket of buckets) {
    const section = el('section', { class: 'jlc-tl-bucket', attrs: { 'aria-label': bucket.key } });
    section.appendChild(el('h3', { class: 'jlc-tl-head', text: bucket.key }));
    const ul = el('ul', { class: 'jlc-card-list' });
    for (const e of bucket.items) ul.appendChild(renderItem(e, ctx, { showDomain: true }));
    section.appendChild(ul);
    rootEl.appendChild(section);
  }
}

// ── 진입점 ────────────────────────────────────────────────
export function renderChecklist(rootEl, { entries, mode, checked, notes, today, anchors, region, regionResources, regionLabel, lang, onCheck, onNote, emptyReason }) {
  if (!rootEl) return;
  rootEl.textContent = '';
  if (!entries || entries.length === 0) {
    rootEl.appendChild(el('p', { class: 'jlc-empty', text: emptyReason || t(lang, 'empty.none') }));
    return;
  }
  const ctx = { checked, notes, today, anchors, region, regionResources, regionLabel, lang, onCheck, onNote };
  if (mode === 'timeline') renderTimeline(rootEl, entries, ctx);
  else renderDomain(rootEl, entries, ctx);
}
