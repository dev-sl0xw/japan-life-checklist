// filter.js — visible_when 평가 + tag/검색 필터. Stop #1에서 본 구현.
// visible_when 시맨틱: 카테고리 → 소분류 → 항목 conjunctive(AND). 빈/누락 = always-visible.

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
