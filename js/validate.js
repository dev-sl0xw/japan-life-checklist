// validate.js — 런타임 items.json 스키마 검증. Stop #1에서 본 구현.

export function validateRuntime(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    errors.push('items.json: object 아님');
    return errors;
  }
  if (typeof data.schema_version !== 'number') {
    errors.push('schema_version 누락 또는 정수 아님');
  }
  if (!Array.isArray(data.profile_flags)) {
    errors.push('profile_flags 누락');
  }
  if (!Array.isArray(data.categories)) {
    errors.push('categories 누락');
  }
  return errors;
}
