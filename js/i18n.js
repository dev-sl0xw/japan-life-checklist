// i18n.js — ko/ja 텍스트 선택, NFKC 정규화 검색 인덱스 헬퍼. Stop #1에서 본 구현.

export const DEFAULT_LANG = 'ko';

export function pickText(obj, lang = DEFAULT_LANG, fallback = '') {
  if (!obj || typeof obj !== 'object') return fallback;
  return obj[`title_${lang}`] ?? obj[`label_${lang}`] ?? obj.title_ko ?? obj.label_ko ?? fallback;
}

export function normalizeForSearch(s) {
  if (s == null) return '';
  // NFKC 정규화 + 공백·구두점 압축. 한국어/일본어 모두 대응.
  return String(s).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}
