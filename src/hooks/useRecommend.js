// 체육부장 훅 — 수업스케치 필터 상태 + 모듈 추천 엔진 호출 + 후보 관리 | 사용처→pages/SketchPage.jsx, 엔진→utils/recommend/, 활동데이터→data/modules/
import { useEffect, useMemo, useState } from 'react'
import activitiesData from '../data/activities.json'
import fmsTaxonomyData from '../data/fmsTaxonomy.json'
import sportsData from '../data/modules/sports.json'
import sportCoreRulesData from '../data/sportCoreRules.json'
import fmsCurriculumData from '../data/modules/fmsCurriculum.json'
import { generateActivityCandidates, hasActivitiesForSport } from '../utils/recommend/activityEngine'
import { generateModularCandidates } from '../utils/recommend/generateModularCandidates'
import { generateCandidates } from '../utils/recommend/generateCandidates'
import { generateNLessonSequence } from '../utils/recommend/generateNLessonSequence'
import { filterCompatibleModules } from '../utils/recommend/moduleCompiler'

const ACTIVITIES = activitiesData.activities

const GRADES = ['3학년', '4학년', '5학년', '6학년']
const DOMAINS = ['스포츠', '놀이']
const SUB_DOMAINS = ['전략형']
const SUB_DOMAINS_BY_DOMAIN = {
  스포츠: ['영역형', '필드형', '네트형'],
  놀이: ['추격형', '민속형', '조작형'],
}
const SPORTS = ['축구', '농구', '피구', '배구', '티볼', '발야구', '빅발리볼', '플라잉디스크', '줄넘기', '공 터치 피구', '컵 배구', '손족구', '가가볼', '핑거 베이스볼', '핑거 발리볼', '술래 놀이', '전래 놀이', '컵 스태킹 놀이']
const SPACES = ['운동장', '체육관', '교실']
const FMS_CATEGORIES = ['이동', '비이동', '조작']

const DURATION_OPTIONS = [30, 35, 40, 45, 50]

const FMS_OPTIONS_BY_CATEGORY = FMS_CATEGORIES.reduce((acc, category) => {
  const categoryInfo = fmsTaxonomyData.taxonomy.find((item) => item.category === category)
  acc[category] = (categoryInfo?.skills || []).map((skill) => skill.name)
  return acc
}, {})

const SPORT_SKILLS_BY_SPORT = {
  축구: ['패스', '드리블', '슛', '트래핑', '침투', '압박 수비'],
  농구: ['패스', '드리블', '슛', '리바운드', '컷인', '도움 수비'],
  피구: ['패스', '던지기', '받기', '회피', '더블팀', '협력 수비'],
  배구: ['리시브', '토스', '서브', '스파이크', '커버', '로테이션'],
  티볼: ['배팅', '송구', '플라이볼 받기', '주루', '수비 위치'],
  발야구: ['굴림킥', '플라이킥', '수비 송구', '주루', '수비 위치'],
  빅발리볼: ['쳐올리기', '토스', '팀 리시브', '서브', '커버'],
  플라잉디스크: ['백핸드 스로', '포핸드 스로', '클랩 캐치', '피벗', '빈 공간 이동'],
  줄넘기: ['양발 모아뛰기', '이중뛰기', '긴줄넘기', '교차뛰기', '리듬 맞추기'],
  '공 터치 피구': ['공 터치 패스', '피하기 이동'],
  '컵 배구': ['컵 배구 받기'],
  '손족구': ['언더토스 서브', '올터치 연결'],
  '가가볼': ['원바운드 타구'],
  '핑거 베이스볼': ['핑거 타격', '핑거 수비 전개'],
  '핑거 발리볼': ['핑거 탭 연결'],
  '술래 놀이': ['도망 반응', '태그 추격'],
  '전래 놀이': ['한 발 뛰기'],
  '컵 스태킹 놀이': ['컵 플립', '스피드 스태킹', '컵 탁구 스매시'],
}

const DEFAULT_EQUIPMENT_BY_SPORT = {
  축구: '축구공, 콘, 조끼, 호루라기',
  농구: '농구공, 콘, 조끼, 호루라기',
  피구: '피구공, 콘, 조끼, 팀조끼, 호루라기',
  배구: '배구공, 네트, 콘, 조끼',
  티볼: '티볼공, 티, 배트, 글러브, 콘',
  발야구: '발야구공, 콘, 팀조끼',
  빅발리볼: '비치볼, 네트, 콘',
  플라잉디스크: '프리스비, 콘, 팀조끼',
  줄넘기: '줄넘기줄, 긴줄',
  '공 터치 피구': '폼볼, 팀조끼, 원마커',
  '컵 배구': '스태킹컵, 풍선공, 네트',
  '손족구': '폼볼, 네트, 원마커',
  '가가볼': '풍선공, 원마커',
  '핑거 베이스볼': '보드판, 미니볼, 카드',
  '핑거 발리볼': '보드판, 미니볼, 네트선',
  '술래 놀이': '팀조끼, 펀스틱, 콘',
  '전래 놀이': '분필, 콘, 원마커',
  '컵 스태킹 놀이': '스태킹컵, 탁구공',
}

function uniq(items) {
  return [...new Set((items || []).filter(Boolean))]
}

function parseEquipmentText(value) {
  return String(value ?? '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getDefaultSportSkills(sport) {
  const options = SPORT_SKILLS_BY_SPORT[sport] || []
  if (sport === '축구') {
    const passSkill = options.find((skill) => skill === '패스') || options[0]
    return passSkill ? [passSkill] : []
  }
  return options.slice(0, 2)
}

function buildDefaultFmsByCategory() {
  const locomotorDefault = FMS_OPTIONS_BY_CATEGORY['이동'].includes('달리기')
    ? ['달리기']
    : FMS_OPTIONS_BY_CATEGORY['이동'].slice(0, 1)

  const nonLocomotorDefault = FMS_OPTIONS_BY_CATEGORY['비이동'].includes('균형 잡기')
    ? ['균형 잡기']
    : []

  const manipulativeDefault = FMS_OPTIONS_BY_CATEGORY['조작'].includes('받기')
    ? ['받기']
    : FMS_OPTIONS_BY_CATEGORY['조작'].slice(0, 1)

  return {
    이동: locomotorDefault,
    비이동: nonLocomotorDefault,
    조작: manipulativeDefault,
  }
}

// Map space to legacy location for fallback engine
function spaceToLegacyLocation(space) {
  if (space === '교실' || space === '체육관') return '실내'
  return '실외'
}

// Get sports filtered by domain (and optionally subDomain)
function getSportsByDomain(domain, subDomain) {
  return sportsData.sports
    .filter((s) => {
      if (domain && s.domain !== domain) return false
      if (subDomain && s.subDomain !== subDomain) return false
      return true
    })
    .map((s) => s.name)
}

export function useRecommend() {
  const [selectedGrade, setSelectedGrade] = useState('6학년')
  const [selectedDomain, setSelectedDomain] = useState('스포츠')
  const [selectedSub, setSelectedSub] = useState('영역형')
  const [selectedSport, setSelectedSport] = useState('축구')
  const [selectedFmsByCategory, setSelectedFmsByCategory] = useState(() => buildDefaultFmsByCategory())
  const [selectedSportSkills, setSelectedSportSkills] = useState(() => getDefaultSportSkills('축구'))
  const [selectedSpace, setSelectedSpace] = useState('운동장')
  const [durationMin, setDurationMin] = useState(40)
  const [availableEquipmentText, setAvailableEquipmentText] = useState('축구공, 콘, 조끼, 호루라기')

  const [generatedCandidates, setGeneratedCandidates] = useState([])
  const [generateMeta, setGenerateMeta] = useState(null)

  const [recommendedActivity, setRecommendedActivity] = useState(null)

  // N차시 모드
  const [nLessonMode, setNLessonMode] = useState(false)
  const [nLessonCount, setNLessonCount] = useState(3)
  const [generatedLessonSequence, setGeneratedLessonSequence] = useState(null)

  const selectedFmsFocus = useMemo(
    () => uniq(FMS_CATEGORIES.flatMap((category) => selectedFmsByCategory[category] || [])),
    [selectedFmsByCategory]
  )
  const isSixthSoccerSingleMode = selectedGrade === '6학년' && selectedSport === '축구' && !nLessonMode
  const primaryFmsFocus = selectedFmsFocus[0] || '받기'
  const primarySportSkill = selectedSportSkills[0] || '패스'

  const [selectedStructureIds, setSelectedStructureIds] = useState([])

  const compatibleModuleCounts = useMemo(() => {
    try {
      const result = filterCompatibleModules({
        grade: selectedGrade,
        sport: selectedSport,
        space: selectedSpace,
      })
      return {
        structures: result.structures,
        structureCount: result.structures.length,
        skillCount: result.skills.length,
        modifierCount: result.modifiers.length,
        gradeConfig: result.gradeConfig,
      }
    } catch {
      return { structures: [], structureCount: 0, skillCount: 0, modifierCount: 0, gradeConfig: null }
    }
  }, [selectedGrade, selectedSport, selectedSpace])

  // recommendAvailability: 3개 엔진 중 하나라도 후보 생성 가능한지 판단
  const recommendAvailability = useMemo(() => {
    const moduleReady = compatibleModuleCounts.structureCount > 0
      && compatibleModuleCounts.skillCount > 0
    const csvReady = hasActivitiesForSport(selectedSport)
    const legacyReady = Boolean(sportCoreRulesData.sports[selectedSport])
    const canRecommend = moduleReady || csvReady || legacyReady
    return { canRecommend, moduleReady, csvReady, legacyReady }
  }, [compatibleModuleCounts, selectedSport])

  // Auto-clean selected structures when compatible list changes
  useEffect(() => {
    if (compatibleModuleCounts.structures.length === 0) return
    const compatibleIds = new Set(compatibleModuleCounts.structures.map((s) => s.id))
    setSelectedStructureIds((prev) => {
      const cleaned = prev.filter((id) => compatibleIds.has(id))
      return cleaned.length === prev.length ? prev : cleaned
    })
  }, [compatibleModuleCounts.structures])

  const toggleStructure = (structureId) => {
    setSelectedStructureIds((prev) => {
      if (prev.includes(structureId)) {
        return prev.filter((id) => id !== structureId)
      }
      return [...prev, structureId]
    })
  }

  const sportSkillOptions = useMemo(
    () => SPORT_SKILLS_BY_SPORT[selectedSport] || [],
    [selectedSport]
  )

  const legacyFilteredActivities = useMemo(() => {
    let filtered = ACTIVITIES

    if (selectedGrade) {
      filtered = filtered.filter((activity) => activity.grades.includes(selectedGrade))
    }

    if (selectedDomain) {
      filtered = filtered.filter((activity) => activity.domain === selectedDomain)
    }

    if (selectedSub) {
      filtered = filtered.filter((activity) => activity.sub === selectedSub)
    }

    if (selectedSport) {
      const sportKeywordMap = {
        축구: ['축구', '킥'],
        농구: ['농구', '바스켓'],
        피구: ['피구'],
        배구: ['배구', '넷볼'],
        티볼: ['티볼', '야구'],
        발야구: ['발야구', '킥볼'],
        빅발리볼: ['빅발리볼', '비치볼'],
        플라잉디스크: ['플라잉디스크', '프리스비', '얼티밋'],
        줄넘기: ['줄넘기', '긴줄'],
      }
      const keywords = sportKeywordMap[selectedSport] || []
      filtered = filtered.filter((activity) =>
        keywords.some((keyword) => activity.name.includes(keyword) || activity.desc.includes(keyword))
      )
    }

    return filtered
  }, [selectedGrade, selectedDomain, selectedSub, selectedSport])

  // Domain → sport auto-switch: when domain changes, switch sport to first of that domain
  useEffect(() => {
    const sportsInDomain = getSportsByDomain(selectedDomain, selectedSub)
    if (sportsInDomain.length > 0 && !sportsInDomain.includes(selectedSport)) {
      setSelectedSport(sportsInDomain[0])
    }
  }, [selectedDomain, selectedSub]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setAvailableEquipmentText(DEFAULT_EQUIPMENT_BY_SPORT[selectedSport] || '공, 콘')
    setSelectedSportSkills((prev) => {
      const available = SPORT_SKILLS_BY_SPORT[selectedSport] || []
      const kept = (prev || []).filter((skill) => available.includes(skill))
      return kept.length > 0 ? kept : getDefaultSportSkills(selectedSport)
    })
  }, [selectedSport])

  const toggleFmsFocus = (category, skill) => {
    setSelectedFmsByCategory((prev) => {
      const current = prev[category] || []
      if (current.includes(skill)) {
        return {
          ...prev,
          [category]: current.filter((item) => item !== skill),
        }
      }

      return {
        ...prev,
        [category]: [...current, skill],
      }
    })
  }

  const clearFmsCategory = (category) => {
    setSelectedFmsByCategory((prev) => ({
      ...prev,
      [category]: [],
    }))
  }

  const toggleSportSkill = (skill) => {
    setSelectedSportSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((item) => item !== skill)
      }
      return [...prev, skill]
    })
  }

  const getSubDomains = (domain) => {
    return SUB_DOMAINS_BY_DOMAIN[domain] || []
  }

  // Get sports filtered by current domain/subDomain
  const filteredSports = useMemo(
    () => getSportsByDomain(selectedDomain, selectedSub),
    [selectedDomain, selectedSub]
  )

  const getRandomRecommendation = () => {
    if (legacyFilteredActivities.length === 0) {
      const rainOkActivities = ACTIVITIES.filter((activity) => activity.rainOk === true)
      if (rainOkActivities.length === 0) {
        return null
      }

      const random = rainOkActivities[Math.floor(Math.random() * rainOkActivities.length)]
      setRecommendedActivity(random)
      return random
    }

    const random = legacyFilteredActivities[Math.floor(Math.random() * legacyFilteredActivities.length)]
    setRecommendedActivity(random)
    return random
  }

  const getGeneratedRecommendations = ({ classSize = 24, lessonHistory = [] } = {}) => {
    const maxCandidates = isSixthSoccerSingleMode ? 1 : 3

    const baseRequest = {
      grade: selectedGrade,
      domain: selectedDomain,
      subDomain: selectedSub,
      sport: selectedSport,
      space: selectedSpace,
      fmsFocus: selectedFmsFocus,
      sportSkills: selectedSportSkills,
      durationMin,
      classSize,
      availableEquipment: parseEquipmentText(availableEquipmentText),
      lessonHistory,
      preferredStructureIds: selectedStructureIds,
      maxCandidates,
    }

    // 1차: CSV 기반 활동 엔진
    const activityResult = generateActivityCandidates(baseRequest)

    if (activityResult.candidates.length > 0) {
      const finalCandidates = activityResult.candidates.slice(0, maxCandidates)
      setGenerateMeta(activityResult.meta)
      setGeneratedCandidates(finalCandidates)
      setRecommendedActivity(null)
      return {
        mode: 'generated',
        request: baseRequest,
        ...activityResult,
        candidates: finalCandidates,
      }
    }

    // 2차: 모듈 엔진 (슬롯 컴파일) fallback
    const modularResult = generateModularCandidates(baseRequest)

    if (modularResult.candidates.length > 0) {
      const finalCandidates = modularResult.candidates.slice(0, maxCandidates)
      setGenerateMeta(modularResult.meta)
      setGeneratedCandidates(finalCandidates)
      setRecommendedActivity(null)
      return {
        mode: 'generated',
        request: baseRequest,
        ...modularResult,
        candidates: finalCandidates,
      }
    }

    // 3차: 레거시 atom 엔진 fallback (3-4학년 제한 해제)
    const legacyRequest = {
      ...baseRequest,
      location: spaceToLegacyLocation(selectedSpace),
    }

    const legacyResult = generateCandidates(legacyRequest)
    const legacyCandidates = legacyResult.candidates.slice(0, maxCandidates)
    setGenerateMeta({ ...legacyResult.meta, engine: 'legacy-fallback' })
    setGeneratedCandidates(legacyCandidates)

    if (legacyCandidates.length > 0) {
      setRecommendedActivity(null)
      return {
        mode: 'generated',
        request: legacyRequest,
        ...legacyResult,
        candidates: legacyCandidates,
      }
    }

    // 4차: 랜덤 fallback
    setGenerateMeta({ engine: 'random-fallback', ...(activityResult.meta || {}) })
    setGeneratedCandidates([])
    const fallbackActivity = getRandomRecommendation()
    return {
      mode: 'fallback',
      request: baseRequest,
      candidates: [],
      fallbackActivity,
      meta: activityResult.meta,
    }
  }

  const getGeneratedNLessonRecommendations = ({ classSize = 24, lessonHistory = [] } = {}) => {
    const request = {
      grade: selectedGrade,
      domain: selectedDomain,
      subDomain: selectedSub,
      sport: selectedSport,
      space: selectedSpace,
      fmsFocus: selectedFmsFocus,
      sportSkills: selectedSportSkills,
      durationMin,
      classSize,
      availableEquipment: parseEquipmentText(availableEquipmentText),
      lessonHistory,
      preferredStructureIds: selectedStructureIds,
    }

    const result = generateNLessonSequence(request, nLessonCount)
    setGeneratedLessonSequence(result)
    setGenerateMeta(result.meta)
    return result
  }

  // FMS curriculum guide for current grade
  const fmsCurriculumGuide = useMemo(() => {
    const guide = fmsCurriculumData.fmsGuide || []
    return guide.filter((g) => g.gradeBand.includes(selectedGrade))
  }, [selectedGrade])

  return {
    selectedGrade,
    selectedDomain,
    selectedSub,
    selectedSport,
    selectedFmsByCategory,
    selectedFmsFocus,
    selectedSportSkills,
    selectedSpace,
    selectedStructureIds,
    durationMin,
    availableEquipmentText,
    legacyFilteredActivities,
    recommendAvailability,
    compatibleModuleCounts,
    generatedCandidates,
    generateMeta,
    recommendedActivity,
    nLessonMode,
    nLessonCount,
    generatedLessonSequence,
    isSixthSoccerSingleMode,
    primaryFmsFocus,
    primarySportSkill,
    fmsCurriculumGuide,

    setSelectedGrade,
    setSelectedDomain,
    setSelectedSub,
    setSelectedSport,
    setSelectedSpace,
    setDurationMin,
    setAvailableEquipmentText,
    setSelectedFmsByCategory,
    setSelectedSportSkills,
    toggleFmsFocus,
    clearFmsCategory,
    toggleSportSkill,
    toggleStructure,
    getSubDomains,
    getRandomRecommendation,
    getGeneratedRecommendations,
    getGeneratedNLessonRecommendations,
    setNLessonMode,
    setNLessonCount,
    filteredSports,

    ACTIVITIES,
    GRADES,
    DOMAINS,
    SUB_DOMAINS,
    SUB_DOMAINS_BY_DOMAIN,
    SPORTS,
    SPACES,
    DURATION_OPTIONS,
    FMS_CATEGORIES,
    FMS_OPTIONS_BY_CATEGORY,
    SPORT_SKILLS_BY_SPORT,
    sportSkillOptions,
  }
}
