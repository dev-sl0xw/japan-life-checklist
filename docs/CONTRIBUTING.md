# Contributing

이 프로젝트는 일본 거주 한국인(외국인) 커뮤니티가 **재사용·확장**할 것을 전제로 합니다. 항목 추가·수정 시 아래 규칙을 따라 주세요.

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

## 3. 이중 언어 (한/일)

페이지는 한↔일 전환을 지원합니다. 항목 추가 시 **`title_ko`/`title_ja`, `description_ko`/`description_ja`**, 카테고리·소분류·플래그·지역의 **`label_ko`/`label_ja`**를 모두 채워 주세요. `title_ko`/`label_ko`에는 일본어 한자를 그대로 넣지 말고 한국어로 작성합니다(일본어는 `_ja` 필드로 분리). UI 정적 문구는 `js/strings.js`의 `STR.ko`/`STR.ja`에 키로 추가합니다.

## 4. visible_when 시맨틱

`visible_when.any_of` / `none_of`는 **카테고리 → 소분류 → 항목 conjunctive(AND)** 평가입니다.
빈 객체나 누락은 always-visible. `none_of`는 명시된 flag가 ON이면 가립니다.

## 5. 「준비중」 플래그 (coming_soon)

아직 콘텐츠가 준비되지 않은 프로필 플래그는 `profile_flags`의 해당 항목에 **`"coming_soon": true`**를 추가합니다. 그러면 UI에 **비활성 버튼 + 「준비중」 배지**로 렌더되어 선택할 수 없습니다(예: 영구 귀국). 콘텐츠를 채워 정식 제공할 때 이 필드를 제거하면 일반 토글로 동작합니다. 배지 문구는 `js/strings.js`의 `profile.comingSoon` 키입니다.

## 6. 카테고리 `anchor` (D-Day 기준일)

카테고리에 **`"anchor": "move"`** 또는 **`"anchor": "job"`**을 지정하면, 사용자가 입력한 이사 예정일/퇴직일을 기준으로 그 카테고리 항목의 `timeline_offset_days`가 **실제 날짜 + 남은 일수**로 계산됩니다. anchor가 없는 카테고리(예: 부업 세무)의 항목은 `timeline: null`로 두어 D-Day 계산에서 제외하고, 기한은 설명문에 적습니다. 날짜 입력은 `YYYY-MM-DD` 형식이며 실재하지 않는 날짜(2월 30일 등)는 거부됩니다.

새 카테고리를 추가할 때는 `label_ko`/`label_ja`, `icon`, 필요 시 `visible_when`(어떤 플래그에서 보일지)을 채웁니다. 새 플래그가 필요하면 `profile_flags`에 `label_ko`/`label_ja`와 함께 추가하세요.

## 7. UI 정적 문구 추가

헤더 버튼·라벨 등 항목 데이터가 아닌 UI 문구는 `js/strings.js`의 `STR.ko`/`STR.ja`에 키를 추가하고, HTML 요소에 `data-i18n="키"`를 부여하면 언어 전환 시 자동 반영됩니다. 별도 페이지(`guide.html` 등)는 `data-lang="ko"|"ja"` 블록으로 양 언어를 작성하고 `jlc:lang` 키를 공유합니다.

## 8. PR 자동 검증

`data/`, `scripts/`, `package.json`, 워크플로 파일 변경 시 GitHub Actions가 자동으로 `node scripts/validate-items.mjs`를 실행합니다. 로컬에서 미리 확인:

```bash
node scripts/validate-items.mjs
# 또는
npm run validate
```

## 9. 라이선스

기여한 콘텐츠는 MIT 라이선스로 공개됩니다(`LICENSE` 참조).
