# Contributing

이 프로젝트는 일본 거주 한국인(외국인) 커뮤니티가 **재사용·확장**할 것을 전제로 합니다. 항목 추가·수정 시 아래 규칙을 따라 주세요.

> 🚧 스캐폴딩(Stop #0) 단계입니다. 본격 콘텐츠 가이드는 Stop #2 이후 강화됩니다.

## 1. 항목(item) id는 불변

한번 publish된 `item.id`는 **변경 금지**입니다. id가 바뀌면 기존 사용자의 체크 상태/메모가 사라집니다. 오타·재명명 필요 시:

- 새 id로 새 항목 추가
- `docs/MIGRATION.md`에 `renamed_ids: {old: new}` 등록
- 다음 release에서 old id 정리

## 2. risk_level별 출처 요구사항

| risk_level | sources[] | last_verified 만료 |
|---|---|---|
| `legal_deadline` | **필수** | **30일 이내** |
| `money_loss` | **필수** | **90일 이내** |
| `service_interruption` | 권장 | 180일 이내 |
| `convenience` | 불요 | 만료 없음 |

`legal_deadline` / `money_loss` 항목의 출처는 가능한 한 1차 공식 사이트:
出入国在留管理庁, 日本年金機構, 協会けんぽ, 国税庁, 自治体 공식, 国土交通省, iDeCo 공식 등.

출처를 못 찾으면 항목을 **`convenience`로 격하**하거나 PR에서 제외하세요. 법정기한 항목의 임의 추측은 금지입니다.

## 3. visible_when 시맨틱

`visible_when.any_of` / `none_of`는 **카테고리 → 소분류 → 항목 conjunctive(AND)** 평가입니다.
빈 객체나 누락은 always-visible. `none_of`는 명시된 flag가 ON이면 가립니다.

## 4. PR 자동 검증

`data/`, `scripts/`, `package.json`, 워크플로 파일 변경 시 GitHub Actions가 자동으로 `node scripts/validate-items.mjs`를 실행합니다. 로컬에서 미리 확인:

```bash
node scripts/validate-items.mjs
# 또는
npm run validate
```

## 5. 라이선스

기여한 콘텐츠는 MIT 라이선스로 공개됩니다(`LICENSE` 참조).
