#!/usr/bin/env node
// validate-items.mjs — Node 20+ ESM, zero-dependency.
// data/items.json 검증. PR마다 GitHub Actions가 실행, 로컬은 `npm run validate`.
//
// 단계 0(스캐폴딩): 최소 동작 — JSON 파싱·필수 필드·id 정규식·visible_when flag 일관성·
//                  risk_level별 sources/last_verified 만료.
// Stop #1 이후: 추가 규칙 강화 가능.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const DATA_PATH  = resolve(__dirname, '..', 'data', 'items.json');

const ID_REGEX = /^[a-z][a-z0-9_]*$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const FRESHNESS_DAYS = {
  legal_deadline:        30,
  money_loss:            90,
  service_interruption:  180,
  convenience:           Infinity,
};

const VALID_RISK_LEVELS = Object.keys(FRESHNESS_DAYS);

function daysBetween(dateStr, todayMs = Date.now()) {
  const d = new Date(dateStr + 'T00:00:00Z').getTime();
  if (Number.isNaN(d)) return Infinity;
  return Math.floor((todayMs - d) / 86400000);
}

function main() {
  const errors = [];
  const warnings = [];

  let raw, data;
  try {
    raw = readFileSync(DATA_PATH, 'utf-8');
  } catch (e) {
    console.error(`✗ cannot read ${DATA_PATH}: ${e.message}`);
    process.exit(1);
  }

  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`✗ invalid JSON: ${e.message}`);
    process.exit(1);
  }

  if (typeof data.schema_version !== 'number') errors.push('schema_version 누락 또는 정수 아님');
  if (!DATE_REGEX.test(data.data_version || '')) errors.push(`data_version 형식 오류 (YYYY-MM-DD 필요): ${data.data_version}`);
  if (!Array.isArray(data.profile_flags)) errors.push('profile_flags 배열 아님');
  if (!Array.isArray(data.categories))    errors.push('categories 배열 아님');

  const flagIds = new Set((data.profile_flags || []).map(f => f.id));
  for (const f of data.profile_flags || []) {
    if (!ID_REGEX.test(f.id || '')) errors.push(`profile_flag.id 정규식 위반: ${f.id}`);
    if (!f.label_ko) errors.push(`profile_flag.label_ko 누락: ${f.id}`);
  }

  // regions (도도부현) + cities(구/시) — 선택적이나 있으면 형식 검증
  const regionIds = new Set();
  const compositeIds = new Set(); // "pref/city"
  if (data.regions !== undefined) {
    if (!Array.isArray(data.regions)) errors.push('regions 배열 아님');
    else for (const r of data.regions) {
      if (!ID_REGEX.test(r.id || '')) errors.push(`region.id 정규식 위반: ${r.id}`);
      if (!r.label_ko) errors.push(`region.label_ko 누락: ${r.id}`);
      regionIds.add(r.id);
      for (const c of r.cities || []) {
        if (!ID_REGEX.test(c.id || '')) errors.push(`region ${r.id}: city.id 정규식 위반: ${c.id}`);
        if (!c.label_ko) errors.push(`region ${r.id}: city.label_ko 누락: ${c.id}`);
        compositeIds.add(`${r.id}/${c.id}`);
      }
    }
  }

  // region_resources — region_key별 지역→링크 배열. _default 허용.
  const regionKeys = new Set();
  if (data.region_resources !== undefined) {
    if (typeof data.region_resources !== 'object' || Array.isArray(data.region_resources)) {
      errors.push('region_resources 객체 아님');
    } else {
      for (const [key, byRegion] of Object.entries(data.region_resources)) {
        regionKeys.add(key);
        if (typeof byRegion !== 'object' || Array.isArray(byRegion)) { errors.push(`region_resources.${key} 객체 아님`); continue; }
        for (const [rid, links] of Object.entries(byRegion)) {
          if (rid !== '_default' && regionIds.size > 0) {
            const known = rid.includes('/') ? compositeIds.has(rid) : regionIds.has(rid);
            if (!known) errors.push(`region_resources.${key}: 알 수 없는 region "${rid}"`);
          }
          if (!Array.isArray(links)) { errors.push(`region_resources.${key}.${rid} 배열 아님`); continue; }
          for (const ln of links) {
            if (!/^https:\/\//.test(ln.url || '')) errors.push(`region_resources.${key}.${rid}: 비-https url "${ln.url}"`);
            if (!ln.label_ko) errors.push(`region_resources.${key}.${rid}: label_ko 누락`);
          }
        }
      }
    }
  }

  const VALID_ANCHORS = new Set(['move', 'job']);

  const seenIds = new Set();
  const checkVisibleWhen = (vw, ctx) => {
    if (!vw) return;
    for (const k of ['any_of', 'none_of']) {
      if (!Array.isArray(vw[k])) continue;
      for (const flag of vw[k]) {
        if (!flagIds.has(flag)) errors.push(`${ctx}: visible_when.${k} 알 수 없는 flag "${flag}"`);
      }
    }
  };

  for (const cat of data.categories || []) {
    if (!ID_REGEX.test(cat.id || '')) errors.push(`category.id 정규식 위반: ${cat.id}`);
    if (seenIds.has(cat.id)) errors.push(`category.id 중복: ${cat.id}`);
    seenIds.add(cat.id);
    checkVisibleWhen(cat.visible_when, `category ${cat.id}`);
    if (cat.anchor !== undefined && !VALID_ANCHORS.has(cat.anchor)) errors.push(`category ${cat.id}: anchor 잘못된 값 "${cat.anchor}" (move|job)`);

    for (const sub of cat.subcategories || []) {
      if (!ID_REGEX.test(sub.id || '')) errors.push(`subcategory.id 정규식 위반: ${sub.id}`);
      if (seenIds.has(sub.id)) errors.push(`subcategory.id 중복: ${sub.id}`);
      seenIds.add(sub.id);
      checkVisibleWhen(sub.visible_when, `subcategory ${sub.id}`);

      for (const item of sub.items || []) {
        if (!ID_REGEX.test(item.id || '')) errors.push(`item.id 정규식 위반: ${item.id}`);
        if (seenIds.has(item.id)) errors.push(`item.id 중복: ${item.id}`);
        seenIds.add(item.id);

        if (!item.title_ko) errors.push(`item ${item.id}: title_ko 누락`);
        if (!DATE_REGEX.test(item.last_verified || '')) errors.push(`item ${item.id}: last_verified 형식 오류`);
        if (!VALID_RISK_LEVELS.includes(item.risk_level)) errors.push(`item ${item.id}: risk_level 잘못된 값 "${item.risk_level}"`);

        checkVisibleWhen(item.visible_when, `item ${item.id}`);

        // sources[] 필수 여부
        const requiresSources = item.risk_level === 'legal_deadline' || item.risk_level === 'money_loss';
        if (requiresSources && (!Array.isArray(item.sources) || item.sources.length === 0)) {
          errors.push(`item ${item.id}: risk_level "${item.risk_level}" 인데 sources[] 비어있음`);
        }

        // last_verified 만료 (단, 스캐폴딩 단계 더미 데이터는 그날 작성이라 통과)
        if (DATE_REGEX.test(item.last_verified || '')) {
          const ageDays = daysBetween(item.last_verified);
          const maxAge = FRESHNESS_DAYS[item.risk_level] ?? Infinity;
          if (ageDays > maxAge) {
            errors.push(`item ${item.id}: last_verified ${ageDays}일 경과 (risk_level "${item.risk_level}" 한도 ${maxAge}일)`);
          }
        }

        // timeline / timeline_offset_days 일관성
        if (item.timeline != null && (item.timeline_offset_days === undefined || item.timeline_offset_days === null)) {
          warnings.push(`item ${item.id}: timeline 있는데 timeline_offset_days 누락`);
        }

        // links url https 확인
        for (const link of item.links || []) {
          if (!/^https:\/\//.test(link.url || '')) errors.push(`item ${item.id}: link.url 비-https "${link.url}"`);
        }

        // needs_verification은 convenience만 허용
        if (item.needs_verification === true && item.risk_level !== 'convenience') {
          errors.push(`item ${item.id}: needs_verification=true 는 convenience 항목 한정`);
        }

        // region_key는 region_resources에 정의되어 있어야 함
        if (item.region_key !== undefined && !regionKeys.has(item.region_key)) {
          errors.push(`item ${item.id}: 알 수 없는 region_key "${item.region_key}"`);
        }
      }
    }
  }

  for (const w of warnings) console.warn(`⚠ ${w}`);
  for (const e of errors)   console.error(`✗ ${e}`);

  if (errors.length > 0) {
    console.error(`\nvalidate failed with ${errors.length} error(s).`);
    process.exit(1);
  }
  console.log(`✓ ${DATA_PATH} OK (${seenIds.size} ids, ${warnings.length} warning(s))`);
}

main();
