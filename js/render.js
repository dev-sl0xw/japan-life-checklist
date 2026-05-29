// render.js — 도메인 뷰 / 타임라인 뷰 렌더러. Stop #1~#3 구현.
// 원칙: textContent only(XSS 방지), 색+텍스트 동반(접근성), aria 상태, ko/ja lang 분리.

const RISK_META = {
  legal_deadline:       { ko: '법정기한', mark: '🟥', cls: 'jlc-risk-legal',       prio: 0 },
  money_loss:           { ko: '금전손실', mark: '🟧', cls: 'jlc-risk-money',       prio: 1 },
  service_interruption: { ko: '서비스중단', mark: '🟨', cls: 'jlc-risk-service',   prio: 2 },
  convenience:          { ko: '편의',     mark: '⬜', cls: 'jlc-risk-convenience', prio: 3 },
};

function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text != null) node.textContent = opts.text;
  if (opts.lang) node.setAttribute('lang', opts.lang);
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
function ymd(d) { return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; }
function dayDiff(a, b) { return Math.round((a.getTime() - b.getTime()) / 86400000); }

// 기준일(anchor) 미설정 → 상대 라벨. 설정 → 실제 날짜 + 카운트다운 + 근접 색상.
function timelineChip(item, cat, anchors, today) {
  if (item.timeline == null) return null;
  const off = item.timeline_offset_days;
  const anchorType = cat?.anchor;          // 'move' | 'job'
  const anchorDate = anchorType && anchors ? anchors[anchorType] : null;

  // 정적 라벨 (기준일 없음)
  const staticSuffix = (typeof off === 'number')
    ? (off === 0 ? 'D-Day' : off < 0 ? `${Math.abs(off)}일 전` : `${off}일 후`) : '';
  const staticText = staticSuffix ? `🕒 ${item.timeline} · ${staticSuffix}` : `🕒 ${item.timeline}`;

  if (!anchorDate || typeof off !== 'number') {
    return { text: staticText, urgency: '', aria: `시점: ${item.timeline}` };
  }

  // 실제 날짜 = 기준일 + offset, 남은 일수 = 그날 - 오늘
  const itemDate = addDays(anchorDate, off);
  const du = dayDiff(itemDate, new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  const md = ymd(itemDate);
  let count, urgency;
  if (du < 0)       { count = `${-du}일 지남`; urgency = 'jlc-u-overdue'; }
  else if (du === 0){ count = '오늘'; urgency = 'jlc-u-now'; }
  else if (du <= 5) { count = `${du}일 남음`; urgency = 'jlc-u-now'; }
  else if (du <= 14){ count = `${du}일 남음`; urgency = 'jlc-u-soon'; }
  else if (du <= 30){ count = `${du}일 남음`; urgency = 'jlc-u-near'; }
  else              { count = `${du}일 남음`; urgency = 'jlc-u-far'; }
  return { text: `📅 ${md} · ${count}`, urgency, aria: `예정일 ${md}, ${count}` };
}

function daysSince(dateStr, today) {
  if (!dateStr || !today) return null;
  const d = new Date(dateStr + 'T00:00:00Z').getTime();
  if (Number.isNaN(d)) return null;
  return Math.floor((today.getTime() - d) / 86400000);
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
    btn.appendChild(el('span', { class: 'jlc-flag-ko', text: flag.label_ko, lang: 'ko' }));
    if (flag.label_ja) btn.appendChild(el('span', { class: 'jlc-flag-ja', text: flag.label_ja, lang: 'ja' }));
    btn.addEventListener('click', () => onToggle(flag.id, !on));
    panelEl.appendChild(btn);
  }
}

// ── 항목 카드 ─────────────────────────────────────────────
function renderItem(entry, ctx, { showDomain = false } = {}) {
  const { item, cat } = entry;
  const { checked, notes, today, anchors, region, regionResources, regionLabel, onCheck, onNote } = ctx;
  const card = el('li', { class: 'jlc-card', attrs: { 'data-item-id': item.id } });

  const top = el('label', { class: 'jlc-card-top' });
  const box = el('input', { attrs: { type: 'checkbox' } });
  box.checked = checked?.[item.id] === true;
  box.addEventListener('change', () => onCheck(item.id, box.checked));
  top.appendChild(box);

  const titleWrap = el('span', { class: 'jlc-card-titles' });
  titleWrap.appendChild(el('span', { class: 'jlc-card-ko', text: item.title_ko, lang: 'ko' }));
  if (item.title_ja) titleWrap.appendChild(el('span', { class: 'jlc-card-ja', text: item.title_ja, lang: 'ja' }));
  top.appendChild(titleWrap);
  card.appendChild(top);

  const meta = el('div', { class: 'jlc-card-meta' });
  if (showDomain) {
    meta.appendChild(el('span', { class: 'jlc-chip jlc-chip-domain', text: `${cat.icon || ''} ${cat.label_ko}`.trim() }));
  }
  const rm = RISK_META[item.risk_level] || RISK_META.convenience;
  meta.appendChild(el('span', {
    class: `jlc-chip ${rm.cls}`, text: `${rm.mark} ${rm.ko}`,
    attrs: { 'aria-label': `위험도: ${rm.ko}` },
  }));
  const tl = timelineChip(item, cat, anchors, today);
  if (tl) meta.appendChild(el('span', {
    class: `jlc-chip jlc-chip-timeline ${tl.urgency}`.trim(), text: tl.text, attrs: { 'aria-label': tl.aria },
  }));
  if (item.needs_verification === true) meta.appendChild(el('span', { class: 'jlc-chip jlc-chip-verify', text: '⚠ 확인 필요' }));
  card.appendChild(meta);

  if (item.description_ko) {
    card.appendChild(el('p', { class: 'jlc-card-desc', text: item.description_ko, lang: 'ko' }));
  }

  // 공식 출처 + 확인일
  if (Array.isArray(item.sources) && item.sources.length > 0) {
    const src = el('div', { class: 'jlc-card-sources' });
    src.appendChild(el('span', { class: 'jlc-src-label', text: '공식 출처:' }));
    for (const s of item.sources) {
      if (!/^https:\/\//.test(s.url || '')) continue;
      src.appendChild(el('a', {
        class: 'jlc-src-link', text: s.label_ko || s.publisher || s.url,
        attrs: { href: s.url, target: '_blank', rel: 'noopener noreferrer' },
      }));
    }
    const age = daysSince(item.last_verified, today);
    if (age != null) src.appendChild(el('span', { class: 'jlc-src-age', text: `ⓘ ${age}일 전 확인` }));
    card.appendChild(src);
  }

  // 바로가기 링크 = 항목 자체 links + 지역(region_key) 해결 링크
  const actionLinks = [];
  for (const ln of item.links || []) if (/^https:\/\//.test(ln.url || '')) actionLinks.push(ln);
  let regionFallbackNote = null;
  if (item.region_key && regionResources && regionResources[item.region_key]) {
    const byRegion = regionResources[item.region_key];
    const pref = region?.pref, city = region?.city;
    const resolved = (city && byRegion[`${pref}/${city}`]) || byRegion[pref] || byRegion._default || [];
    for (const ln of resolved) if (/^https:\/\//.test(ln.url || '')) actionLinks.push(ln);
    if (resolved.length === 0) regionFallbackNote = `📍 ${regionLabel}: 거주 지자체 공식 사이트에서 확인하세요`;
  }
  if (actionLinks.length > 0) {
    const row = el('div', { class: 'jlc-card-actions' });
    row.appendChild(el('span', { class: 'jlc-action-label', text: '바로가기:' }));
    for (const ln of actionLinks) {
      row.appendChild(el('a', {
        class: 'jlc-action-link', text: ln.label_ko || ln.publisher || ln.url,
        attrs: { href: ln.url, target: '_blank', rel: 'noopener noreferrer' },
      }));
    }
    card.appendChild(row);
  }
  if (regionFallbackNote) card.appendChild(el('p', { class: 'jlc-region-note', text: regionFallbackNote }));

  // 메모 (사생활 — 인쇄 숨김)
  const details = el('details', { class: 'jlc-card-notes' });
  const summary = el('summary', { class: 'jlc-notes-summary' });
  const hasNote = !!(notes && notes[item.id]);
  summary.textContent = hasNote ? '📝 메모 (작성됨)' : '📝 메모';
  details.appendChild(summary);
  if (hasNote) details.open = false;
  const ta = el('textarea', { class: 'jlc-note-input', attrs: { rows: '2', 'aria-label': `${item.title_ko} 메모`, placeholder: '개인 메모(이 브라우저에만 저장)' } });
  ta.value = (notes && notes[item.id]) || '';
  ta.addEventListener('input', () => onNote(item.id, ta.value, summary));
  details.appendChild(ta);
  card.appendChild(details);

  return card;
}

// ── 도메인 뷰 ─────────────────────────────────────────────
function renderDomain(rootEl, entries, ctx) {
  // cat → sub 순서 유지(원본 순)
  const byCat = new Map();
  for (const e of entries) {
    if (!byCat.has(e.cat.id)) byCat.set(e.cat.id, { cat: e.cat, subs: new Map() });
    const c = byCat.get(e.cat.id);
    if (!c.subs.has(e.sub.id)) c.subs.set(e.sub.id, { sub: e.sub, items: [] });
    c.subs.get(e.sub.id).items.push(e);
  }
  for (const { cat, subs } of byCat.values()) {
    const section = el('section', { class: 'jlc-cat', attrs: { 'aria-label': cat.label_ko } });
    const head = el('h3', { class: 'jlc-cat-head' });
    head.appendChild(el('span', { text: `${cat.icon || ''} ${cat.label_ko}`.trim(), lang: 'ko' }));
    if (cat.label_ja) head.appendChild(el('span', { class: 'jlc-cat-ja', text: cat.label_ja, lang: 'ja' }));
    section.appendChild(head);
    for (const { sub, items } of subs.values()) {
      const subWrap = el('div', { class: 'jlc-sub' });
      const subHead = el('h4', { class: 'jlc-sub-head' });
      subHead.appendChild(el('span', { text: sub.label_ko, lang: 'ko' }));
      if (sub.label_ja) subHead.appendChild(el('span', { class: 'jlc-sub-ja', text: sub.label_ja, lang: 'ja' }));
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

  // 버킷: timeline 라벨 기준. null → "시점 미정"
  const buckets = [];
  const idx = new Map();
  for (const e of sorted) {
    const key = e.item.timeline || '시점 미정';
    if (!idx.has(key)) { idx.set(key, buckets.length); buckets.push({ key, items: [] }); }
    buckets[idx.get(key)].items.push(e);
  }
  for (const bucket of buckets) {
    const section = el('section', { class: 'jlc-tl-bucket', attrs: { 'aria-label': `시점 ${bucket.key}` } });
    section.appendChild(el('h3', { class: 'jlc-tl-head', text: bucket.key }));
    const ul = el('ul', { class: 'jlc-card-list' });
    for (const e of bucket.items) ul.appendChild(renderItem(e, ctx, { showDomain: true }));
    section.appendChild(ul);
    rootEl.appendChild(section);
  }
}

// ── 진입점 ────────────────────────────────────────────────
// entries: 필터 적용된 [{cat, sub, item}]. mode: 'domain'|'timeline'.
export function renderChecklist(rootEl, { entries, mode, checked, notes, today, anchors, region, regionResources, regionLabel, onCheck, onNote, emptyReason }) {
  if (!rootEl) return;
  rootEl.textContent = '';
  if (!entries || entries.length === 0) {
    rootEl.appendChild(el('p', { class: 'jlc-empty', text: emptyReason || '표시할 항목이 없습니다.' }));
    return;
  }
  const ctx = { checked, notes, today, anchors, region, regionResources, regionLabel, onCheck, onNote };
  if (mode === 'timeline') renderTimeline(rootEl, entries, ctx);
  else renderDomain(rootEl, entries, ctx);
}
