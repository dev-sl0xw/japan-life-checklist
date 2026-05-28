// render.js — 도메인 뷰 / 타임라인 뷰 렌더러. Stop #1에서 본 구현.
// 원칙: DocumentFragment 초기 1회 빌드, 이후 section-level rerender + DOM 재활용. 풀 rerender 금지.

export function renderEmpty(rootEl) {
  if (!rootEl) return;
  rootEl.textContent = '';
  const p = document.createElement('p');
  p.className = 'text-slate-500';
  p.textContent = '(스캐폴딩 단계 — 콘텐츠는 Stop #2에서 추가됨)';
  rootEl.appendChild(p);
}
