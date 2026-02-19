// 수업 추천 헬퍼 — 날씨 판단 → 실내/실외/주의 모드 결정 → 활동 제안 | 사용처→SchedulePage, LessonLogModal
import { LESSON_ACTIVITY_LIBRARY } from '../constants/lessonDefaults'

export const getLessonRecommendationMode = (judgment) => {
  const status = judgment?.status

  if (status === 'optimal') return 'optimal'
  if (status === 'caution') return 'caution'
  if (status === 'bad') return 'indoors'

  return 'indoors'
}

export const getLessonSuggestions = (judgment, domain = '스포츠') => {
  const resolvedDomain = LESSON_ACTIVITY_LIBRARY[domain] ? domain : '기타'
  const mode = getLessonRecommendationMode(judgment)
  return LESSON_ACTIVITY_LIBRARY[resolvedDomain][mode]
}

export const getSuggestionSummary = (judgment) => {
  const mode = getLessonRecommendationMode(judgment)
  if (mode === 'optimal') return '현재 조건에서 야외 활동이 무난합니다'
  if (mode === 'caution') return '강수·미세먼지 주의, 조정된 활동을 추천해요'
  return '실내 대체 활동으로 진행하면 더 안정적입니다'
}
