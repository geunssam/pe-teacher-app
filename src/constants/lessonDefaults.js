// 수업 기록 관련 상수 — 도메인 목록, 활동 라이브러리, 기본 폼 값
// 사용처: SchedulePage, (향후) LessonLogModal

export const LESSON_DOMAINS = ['운동', '스포츠', '놀이', '표현', '기타']

export const LESSON_ACTIVITY_LIBRARY = {
  스포츠: {
    optimal: ['빠르게 이어달리기', '교차줄넘기', '협력 릴레이'],
    caution: ['정적 스트레칭 순환', '제자리 활동 드릴', '볼 패스 릴레이(저강도)'],
    indoors: ['기초 근력(맨몸)', '균형 트레이닝', '볼 없이 동작 정렬'],
  },
  놀이: {
    optimal: ['장비 줄잡기 놀이', '오리엔테이션 추격전', '협동 미션 보드'],
    caution: ['조용한 신체놀이', '숫자 제자리 게임', '소근육 협응 놀이'],
    indoors: ['실내 이동 놀이', '정렬·대기 게임', '제한 공간 반응 놀이'],
  },
  표현: {
    optimal: ['공간 라인댄스', '구간 이동 퍼포먼스', '리듬 동작 결합'],
    caution: ['제자리 안무', '동작 연결 리듬', '조별 동작 반복 연습'],
    indoors: ['기초 동작 결합', '파트별 안무 정렬', '호흡·균형 연습'],
  },
  기타: {
    optimal: ['웜업 루틴', '기초 체력 순환', '저강도 협업 활동'],
    caution: ['정적 활동 중심 수업', '소도구 활용 실내 활동', '교실형 체력 활동'],
    indoors: ['기초 체력 훈련', '기본 동작 정렬', '교재 기반 활동'],
  },
}

export const LESSON_FORM_DEFAULT = {
  activity: '',
  domain: '스포츠',
  variation: '',
  memo: '',
  sequence: '',
  performance: '',
}

// 특별행사 태그 목록 — 시간표 메모에 [행사:xxx] 형식으로 삽입
export const SPECIAL_EVENTS = [
  { key: 'earthquake-drill',  label: '지진대피훈련',  icon: '🔔' },
  { key: 'fire-drill',        label: '화재대피훈련',  icon: '🔥' },
  { key: 'sports-day',        label: '운동회',        icon: '🏅' },
  { key: 'field-trip',        label: '현장학습',      icon: '🚌' },
  { key: 'exam',              label: '시험',          icon: '📝' },
  { key: 'open-class',        label: '공개수업',      icon: '👀' },
  { key: 'pe-tournament',     label: '체육대회',      icon: '🏆' },
  { key: 'morning-broadcast', label: '방송조회',      icon: '📢' },
]

// 태그 형식: [행사:지진대피훈련] 추가 메모...
const EVENT_TAG_REGEX = /^\[행사:([^\]]+)\]\s*/

/**
 * 메모에서 행사 태그를 파싱
 * @param {string} memo
 * @returns {{ eventLabel: string|null, cleanMemo: string }}
 */
export function parseEventTag(memo) {
  if (!memo) return { eventLabel: null, cleanMemo: '' }
  const match = memo.match(EVENT_TAG_REGEX)
  if (!match) return { eventLabel: null, cleanMemo: memo }
  return { eventLabel: match[1], cleanMemo: memo.replace(EVENT_TAG_REGEX, '') }
}

/**
 * 메모 앞에 행사 태그 삽입
 * @param {string} memo - 기존 메모 (태그 있으면 제거 후 삽입)
 * @param {string} label - 행사 라벨 (예: '지진대피훈련')
 * @returns {string}
 */
export function prependEventTag(memo, label) {
  const { cleanMemo } = parseEventTag(memo)
  const trimmed = cleanMemo.trim()
  return trimmed ? `[행사:${label}] ${trimmed}` : `[행사:${label}]`
}

/**
 * 메모에서 행사 태그 제거
 * @param {string} memo
 * @returns {string}
 */
export function removeEventTag(memo) {
  if (!memo) return ''
  return memo.replace(EVENT_TAG_REGEX, '').trim()
}
