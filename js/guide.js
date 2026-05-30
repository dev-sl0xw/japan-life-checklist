// guide.js — 사용법 페이지 언어 토글. index.html과 jlc:lang 키 공유.
// 의존성 없음. data-lang="ko"|"ja" 블록을 현재 언어만 표시.
// 저장 포맷은 store.js와 동일하게 JSON 인코딩("ja"/"ko")을 사용.
const KEY = 'jlc:lang';

function getLang() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return v === 'ja' ? 'ja' : 'ko';
  } catch { return 'ko'; }
}
function setLang(l) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* degraded mode: 무시 */ }
}
function apply(l) {
  document.documentElement.lang = l;
  for (const node of document.querySelectorAll('[data-lang]')) {
    node.hidden = node.getAttribute('data-lang') !== l;
  }
  const btn = document.getElementById('btn-lang');
  if (btn) btn.textContent = l === 'ko' ? '日本語' : '한국어';
}

let cur = getLang();
apply(cur);

document.getElementById('btn-lang')?.addEventListener('click', () => {
  cur = cur === 'ko' ? 'ja' : 'ko';
  setLang(cur);
  apply(cur);
});

// 다른 탭(체크리스트 본문)에서 언어를 바꾸면 이 페이지도 동기화
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  let v;
  try { v = JSON.parse(e.newValue); } catch { return; }
  if (v === 'ko' || v === 'ja') { cur = v; apply(cur); }
});
