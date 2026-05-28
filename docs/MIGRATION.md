# Migration Guide

`jlc:schema_version`이 변경될 때 사용자 localStorage 데이터를 안전하게 이행하기 위한 가이드입니다.

> 🚧 스캐폴딩(Stop #0) 단계 — 본격 마이그레이션 코드는 Stop #1 이후 추가됩니다.

## 트리거

1. `data/items.json` 의 `schema_version`이 올라감 → 앱이 사용자의 `jlc:schema_version`을 비교
2. 사용자 버전 < 앱 버전 → `migrate(from, to)` 실행
3. 사용자 버전 > 앱 버전 → "앱을 새로고침 해 주세요" 모달 (사용자는 미리 새 데이터를 봤음)

## 마이그레이션 테이블 양식

```js
const MIGRATIONS = {
  // v1 → v2
  2: {
    removed_ids:  ["mv_decide_old_001"],
    renamed_ids:  { "mv_decide_compare_001": "mv_decide_compare_v2" },
    removed_flags: [],
    renamed_flags: {},
  },
};
```

## 정책

- **`removed_ids`** 또는 **renamed의 old**에 매달린 `jlc:checked` / `jlc:notes` 값은 **삭제하지 않고 `jlc:orphan`으로 이동**. UI에 "숨겨진 진행 기록 N개 보기" 링크 노출.
- `renamed_ids`는 `jlc:checked[old]` → `jlc:checked[new]` 이동.
- `removed_flags`에 매달린 `jlc:profile` 값은 단순 삭제(false).
- `renamed_flags`는 동일 이동.
- 마이그레이션 실패 시 **원본 보존**, 사용자에게 "복구 필요" 모달.

## 작성 절차

1. `data/items.json` 의 `schema_version`을 올린다.
2. `MIGRATIONS[N]`에 변경 사항을 등록한다.
3. `app_min_schema_version` 도 함께 올려 구버전 호환 가능 한도를 명시한다.
4. 단위 테스트(직접 작성 — 의존성 0 원칙)로 마이그레이션 결과를 확인한다.
5. PR 설명에 마이그레이션 영향(영향 받는 id 목록, 예상 사용자 비율)을 기록한다.
