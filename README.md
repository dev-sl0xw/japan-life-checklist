# Japan Life Checklist

일본 거주 한국인(외국인)을 위한 **이사 · 이직 · 필수 행정 자가 검토 체크리스트**.

조건부 공개 UX(상단 My Profile 패널) 기반으로 "내 상황에 해당하는 항목"만 보여주며, 진행 상황은 브라우저 `localStorage`에 저장됩니다(서버 전송 없음).

> 🚧 **현재 골격(Stop #0) 단계입니다.** 콘텐츠와 기능은 순차 채워집니다.

## 사용법

공개 URL: <https://dev-sl0xw.github.io/japan-life-checklist/>

로컬 실행:

```bash
git clone https://github.com/dev-sl0xw/japan-life-checklist.git
cd japan-life-checklist
npm run serve   # 또는: python3 -m http.server 8000
```

브라우저에서 <http://localhost:8000> 접속.

> ⚠️ `index.html`을 `file://`로 직접 열면 `fetch()`가 CORS로 차단됩니다. 반드시 정적 서버를 통해 접속하세요.

## 데이터 보관

- 체크 상태·메모·프로필 토글은 모두 **사용자 브라우저의 localStorage**에만 저장됩니다.
- 서버 전송 없음 / 다른 사용자 진행 상황 비공개.
- 브라우저/디바이스/시크릿 모드/in-app 브라우저별로 데이터가 분리됩니다.
- 백업·이전: 하단 **진행 상황 JSON 내보내기** 사용.

## 기여

`docs/CONTRIBUTING.md`를 먼저 확인해 주세요. 항목 추가 시 `risk_level`별 출처 요구사항이 다릅니다.

PR마다 GitHub Actions가 `node scripts/validate-items.mjs`로 자동 검증합니다. 로컬에서 검증하려면:

```bash
node scripts/validate-items.mjs
# 또는
npm run validate
```

## 라이선스

MIT — 자유롭게 fork·재배포·재사용 가능. `LICENSE` 참조.
