// app.js — 부트스트랩. Stop #1에서 본 구현.
// 단계 0(스캐폴딩) 시점에서는 data_version 표시 + 기본 로드만 동작.

const APP_SCHEMA_VERSION = 1;

async function boot() {
  const display = document.getElementById('data-version-display');
  try {
    const res = await fetch('./data/items.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (display) {
      display.textContent = `data_version: ${data.data_version ?? 'unknown'} · schema_version: ${data.schema_version ?? '?'}`;
    }
    if (typeof data.schema_version === 'number' && data.schema_version > APP_SCHEMA_VERSION) {
      const banner = document.getElementById('banner-region');
      if (banner) {
        banner.textContent = '⚠ 콘텐츠 스키마가 현재 앱보다 최신입니다. 페이지를 새로고침 해 주세요.';
      }
    }
  } catch (err) {
    if (display) display.textContent = `data load failed: ${err.message}`;
    console.error('[jlc] items.json load failed', err);
  }
}

boot();
