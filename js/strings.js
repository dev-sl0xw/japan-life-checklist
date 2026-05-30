// strings.js — UI 문구 i18n 테이블 (ko/ja). Stop: 언어 토글.
// 정적 UI는 data-i18n 키로, 동적 문구는 함수로 제공.

export const LANGS = ['ko', 'ja'];
export const DEFAULT_LANG = 'ko';

// data-i18n 키 → {ko, ja}
export const STR = {
  ko: {
    'app.guide': '❓ 사용법',
    'app.export': '⬇ 내보내기',
    'app.import': '⬆ 가져오기',
    'app.reset': '↺ 초기화',
    'profile.title': '📋 내 상황 (My Profile)',
    'profile.clear': '모두 해제',
    'profile.hint': '해당하는 항목을 켜면, 그에 맞는 체크리스트만 아래에 표시됩니다.',
    'profile.comingSoon': '준비중',
    'tb.anchorMove': '📅 이사 예정일',
    'tb.anchorJob': '퇴직(이직)일',
    'tb.anchorHint': 'YYYY-MM-DD로 입력하면 D-Day가 실제 날짜로 계산됩니다',
    'tb.region': '🗾 거주 지역',
    'tb.regionHint': '대형쓰레기·役所 등 지역별 안내에 반영 (도쿄도는 23구 선택 가능)',
    'tb.cityAll': '(구/시 전체)',
    'tb.view': '보기',
    'tb.viewDomain': '도메인별',
    'tb.viewTimeline': '타임라인순',
    'tb.status': '상태',
    'tb.statusAll': '전체',
    'tb.statusIncomplete': '미완료',
    'tb.statusDone': '완료',
    'tb.risk': '위험도',
    'tb.riskAll': '전체',
    'tb.riskLegal': '🟥 법정기한',
    'tb.riskMoney': '🟧 금전손실',
    'tb.riskService': '🟨 서비스중단',
    'tb.riskConv': '⬜ 편의',
    'tb.search': '검색',
    'tb.searchPh': '제목·설명·일본어 검색 (예: 任意継続, 면허)',
    'tb.settingsReset': '↺ 표시 설정 초기화',
    'cl.title': '체크리스트',
    'card.sources': '공식 출처:',
    'card.links': '바로가기:',
    'card.memo': '📝 메모',
    'card.memoDone': '📝 메모 (작성됨)',
    'card.memoPh': '개인 메모(이 브라우저에만 저장)',
    'card.needsVerify': '⚠ 확인 필요',
    'risk.legal_deadline': '법정기한',
    'risk.money_loss': '금전손실',
    'risk.service_interruption': '서비스중단',
    'risk.convenience': '편의',
    'empty.noProfile': '위 「내 상황」에서 해당하는 항목을 켜 주세요.',
    'empty.noMatch': '검색·필터 조건에 맞는 항목이 없습니다.',
    'empty.none': '표시할 항목이 없습니다.',
    'banner.noStorage': '이 브라우저에서는 진행 상황이 저장되지 않습니다. 「내보내기」로 백업하세요.',
    'banner.loadFail': '최신 데이터를 확인할 수 없습니다. 표시 내용이 오래되었을 수 있습니다.',
    'banner.schemaAhead': '콘텐츠 스키마가 현재 앱보다 최신입니다. 페이지를 새로고침 해 주세요.',
    'reset.confirm': '체크·메모·내 상황 설정을 모두 삭제합니다. 계속할까요? (이 작업은 되돌릴 수 없습니다)',
    'reset.done': '초기화되었습니다.',
    'settingsReset.done': '표시 설정(날짜·지역·필터·검색·보기)을 초기화했습니다.',
    'lang.toggle': '日本語',
  },
  ja: {
    'app.guide': '❓ 使い方',
    'app.export': '⬇ エクスポート',
    'app.import': '⬆ インポート',
    'app.reset': '↺ リセット',
    'profile.title': '📋 マイ・プロフィール',
    'profile.clear': 'すべて解除',
    'profile.hint': '該当する項目をオンにすると、それに合ったチェックリストだけが下に表示されます。',
    'profile.comingSoon': '準備中',
    'tb.anchorMove': '📅 引っ越し予定日',
    'tb.anchorJob': '退職（転職）日',
    'tb.anchorHint': 'YYYY-MM-DDで入力するとD-Dayが実際の日付で計算されます',
    'tb.region': '🗾 お住まいの地域',
    'tb.regionHint': '粗大ごみ・役所など地域別の案内に反映（東京都は23区を選択可能）',
    'tb.cityAll': '（区/市すべて）',
    'tb.view': '表示',
    'tb.viewDomain': '分野別',
    'tb.viewTimeline': 'タイムライン順',
    'tb.status': '状態',
    'tb.statusAll': 'すべて',
    'tb.statusIncomplete': '未完了',
    'tb.statusDone': '完了',
    'tb.risk': '重要度',
    'tb.riskAll': 'すべて',
    'tb.riskLegal': '🟥 法定期限',
    'tb.riskMoney': '🟧 金銭損失',
    'tb.riskService': '🟨 サービス停止',
    'tb.riskConv': '⬜ 利便',
    'tb.search': '検索',
    'tb.searchPh': 'タイトル・説明・日本語で検索（例：任意継続）',
    'tb.settingsReset': '↺ 表示設定をリセット',
    'cl.title': 'チェックリスト',
    'card.sources': '公式情報源:',
    'card.links': 'リンク:',
    'card.memo': '📝 メモ',
    'card.memoDone': '📝 メモ（記入済み）',
    'card.memoPh': '個人メモ（このブラウザにのみ保存）',
    'card.needsVerify': '⚠ 要確認',
    'risk.legal_deadline': '法定期限',
    'risk.money_loss': '金銭損失',
    'risk.service_interruption': 'サービス停止',
    'risk.convenience': '利便',
    'empty.noProfile': '上の「マイ・プロフィール」で該当する項目をオンにしてください。',
    'empty.noMatch': '検索・フィルター条件に合う項目がありません。',
    'empty.none': '表示する項目がありません。',
    'banner.noStorage': 'このブラウザでは進捗が保存されません。「エクスポート」でバックアップしてください。',
    'banner.loadFail': '最新データを取得できませんでした。表示内容が古い可能性があります。',
    'banner.schemaAhead': 'コンテンツのスキーマがアプリより新しいです。ページを再読み込みしてください。',
    'reset.confirm': 'チェック・メモ・プロフィール設定をすべて削除します。続けますか？（この操作は取り消せません）',
    'reset.done': 'リセットしました。',
    'settingsReset.done': '表示設定（日付・地域・フィルター・検索・表示）をリセットしました。',
    'lang.toggle': '한국어',
  },
};

export function t(lang, key) {
  return (STR[lang] && STR[lang][key]) || STR.ko[key] || key;
}

// 동적 문구 포매터
export function fmtProgress(lang, done, total) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  if (total === 0) return lang === 'ja' ? '該当項目なし' : '해당 항목 없음';
  return lang === 'ja' ? `進捗 ${done} / ${total} (${pct}%)` : `진행률 ${done} / ${total} (${pct}%)`;
}
export function fmtResultCount(lang, shown, total) {
  return lang === 'ja' ? `表示 ${shown}件 / 該当 ${total}件` : `표시 ${shown}개 / 해당 ${total}개`;
}
export function fmtDataAsOf(lang, ver, schema) {
  return lang === 'ja' ? `データ基準日: ${ver} · schema v${schema}` : `데이터 기준일: ${ver} · schema v${schema}`;
}
// 타임라인 카운트다운
export function fmtCountdown(lang, du) {
  if (du === 0) return lang === 'ja' ? '本日' : '오늘';
  if (du < 0)  return lang === 'ja' ? `${-du}日経過` : `${-du}일 지남`;
  return lang === 'ja' ? `あと${du}日` : `${du}일 남음`;
}
export function fmtRelative(lang, off) {
  if (off === 0) return 'D-Day';
  if (off < 0)  return lang === 'ja' ? `${Math.abs(off)}日前` : `${Math.abs(off)}일 전`;
  return lang === 'ja' ? `${off}日後` : `${off}일 후`;
}
export function fmtVerifiedAgo(lang, days) {
  return lang === 'ja' ? `ⓘ ${days}日前に確認` : `ⓘ ${days}일 전 확인`;
}
export function fmtRegionNote(lang, label) {
  return lang === 'ja'
    ? `📍 ${label}: お住まいの自治体の公式サイトでご確認ください`
    : `📍 ${label}: 거주 지자체 공식 사이트에서 확인하세요`;
}
