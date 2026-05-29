// filter.js — visible_when 평가 + 검색/상태/위험 필터. Stop #1~#3 구현.
// visible_when 시맨틱: 카테고리 → 소분류 → 항목 conjunctive(AND). 빈/누락 = always-visible.

import { normalizeForSearch } from './i18n.js?v=2026-05-30d';

export function isVisible(visibleWhen, profile) {
  if (!visibleWhen) return true;
  const { any_of, none_of } = visibleWhen;
  if (Array.isArray(any_of) && any_of.length > 0) {
    if (!any_of.some(flag => profile?.[flag] === true)) return false;
  }
  if (Array.isArray(none_of) && none_of.length > 0) {
    if (none_of.some(flag => profile?.[flag] === true)) return false;
  }
  return true;
}

export function isVisibleWithAncestors(item, subcategory, category, profile) {
  return (
    isVisible(category?.visible_when, profile) &&
    isVisible(subcategory?.visible_when, profile) &&
    isVisible(item?.visible_when, profile)
  );
}

// profile 조건을 만족하는 항목을 평탄화. [{cat, sub, item}]
export function flattenVisible(data, profile) {
  const out = [];
  for (const cat of data.categories || []) {
    if (!isVisible(cat.visible_when, profile)) continue;
    for (const sub of cat.subcategories || []) {
      if (!isVisible(sub.visible_when, profile)) continue;
      for (const item of sub.items || []) {
        if (!isVisible(item.visible_when, profile)) continue;
        out.push({ cat, sub, item });
      }
    }
  }
  return out;
}

// 검색 인덱스: item.id → 정규화 문자열 (KR + JA + 설명 + 태그)
export function buildSearchIndex(data) {
  const index = new Map();
  for (const cat of data.categories || []) {
    for (const sub of cat.subcategories || []) {
      for (const item of sub.items || []) {
        const parts = [
          item.title_ko, item.title_ja, item.description_ko,
          ...(item.tags || []),
          cat.label_ko, sub.label_ko,
        ];
        index.set(item.id, normalizeForSearch(parts.filter(Boolean).join(' ')));
      }
    }
  }
  return index;
}

export function matchesSearch(item, query, index) {
  if (!query) return true;
  const norm = normalizeForSearch(query);
  if (!norm) return true;
  const hay = index.get(item.id) || '';
  // 공백 구분 토큰 전부 포함(AND)
  return norm.split(' ').every(tok => hay.includes(tok));
}

export function matchesStatus(item, checked, status) {
  if (status === 'incomplete') return checked?.[item.id] !== true;
  if (status === 'done') return checked?.[item.id] === true;
  return true; // all
}

export function matchesRisk(item, risk) {
  if (!risk || risk === 'all') return true;
  return item.risk_level === risk;
}
