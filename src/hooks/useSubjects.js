import { useLocalStorage } from './useLocalStorage'

/**
 * 과목 관리 Hook
 *
 * localStorage 스키마:
 * - pe_subjects: ["국어", "수학", "영어", ...]
 * - pe_subject_colors: { "국어": { bg: "#DBEAFE", text: "#1E40AF" }, ... }
 */

// 기본 과목 색상 프리셋
export const COLOR_PRESETS = [
  { name: '파란색', bg: '#DBEAFE', text: '#1E40AF' },
  { name: '초록색', bg: '#D1FAE5', text: '#065F46' },
  { name: '노란색', bg: '#FEF3C7', text: '#92400E' },
  { name: '빨간색', bg: '#FEE2E2', text: '#991B1B' },
  { name: '보라색', bg: '#EDE9FE', text: '#5B21B6' },
  { name: '분홍색', bg: '#FCE7F3', text: '#9F1239' },
  { name: '주황색', bg: '#FFEDD5', text: '#9A3412' },
  { name: '청록색', bg: '#CCFBF1', text: '#115E59' },
]

const DEFAULT_SUBJECTS = ['국어', '수학', '영어', '과학', '사회', '체육', '음악', '미술']

export function useSubjects() {
  const [subjects, setSubjects] = useLocalStorage('pe_subjects', DEFAULT_SUBJECTS)
  const [subjectColors, setSubjectColors] = useLocalStorage('pe_subject_colors', {
    '국어': COLOR_PRESETS[0],
    '수학': COLOR_PRESETS[1],
    '영어': COLOR_PRESETS[2],
    '과학': COLOR_PRESETS[3],
    '사회': COLOR_PRESETS[4],
    '체육': COLOR_PRESETS[5],
    '음악': COLOR_PRESETS[6],
    '미술': COLOR_PRESETS[7],
  })

  /**
   * 과목 추가
   */
  const addSubject = (name, color = COLOR_PRESETS[0]) => {
    if (subjects.includes(name)) {
      return false
    }
    setSubjects([...subjects, name])
    setSubjectColors({ ...subjectColors, [name]: color })
    return true
  }

  /**
   * 과목 삭제
   */
  const removeSubject = (name) => {
    setSubjects(subjects.filter(s => s !== name))
    const newColors = { ...subjectColors }
    delete newColors[name]
    setSubjectColors(newColors)
  }

  /**
   * 과목 색상 변경
   */
  const setSubjectColor = (name, color) => {
    setSubjectColors({ ...subjectColors, [name]: color })
  }

  /**
   * 과목 색상 가져오기
   */
  const getSubjectColor = (name) => {
    return subjectColors[name] || COLOR_PRESETS[0]
  }

  return {
    subjects,
    subjectColors,
    COLOR_PRESETS,
    addSubject,
    removeSubject,
    setSubjectColor,
    getSubjectColor,
  }
}
