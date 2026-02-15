// 체육부장 훅 — 수업스케치 필터 상태 + 모듈 추천 엔진 호출 + 후보 관리 | 사용처→pages/SketchPage.jsx, 엔진→utils/recommend/, 활동데이터→data/modules/
import { useEffect, useMemo, useState } from 'react'
import activitiesData from '../data/activities.json'
import fmsTaxonomyData from '../data/fmsTaxonomy.json'
import sportsData from '../data/modules/sports.json'
import skillsData from '../data/modules/skills.json'
import sportCoreRulesData from '../data/sportCoreRules.json'
import fmsCurriculumData from '../data/modules/fmsCurriculum.json'
import { generateActivityCandidates, hasActivitiesForSport } from '../utils/recommend/activityEngine'
import { generateModularCandidates } from '../utils/recommend/generateModularCandidates'
import { generateCandidates } from '../utils/recommend/generateCandidates'
import { filterCompatibleModules } from '../utils/recommend/moduleCompiler'

const ACTIVITIES = activitiesData.activities

const GRADES = ['3학년', '4학년', '5학년', '6학년']
const DOMAINS = ['스포츠', '놀이']
const SUB_DOMAINS = ['전략형']
const SUB_DOMAINS_BY_DOMAIN = {
  스포츠: ['영역형', '필드형', '네트형'],
  놀이: ['추격형', '민속형', '조작형'],
}
const SPORTS = sportsData.sports.map((s) => s.name)
const SPACES = ['운동장', '체육관', '교실']
const FMS_CATEGORIES = ['이동', '비이동', '조작']
const MAX_RECOMMENDATION_COUNT = Math.max(1, ACTIVITIES.length)

const DURATION_OPTIONS = [30, 35, 40, 45, 50]
const DEFAULT_GRADE = GRADES[0]

const FMS_OPTIONS_BY_CATEGORY = FMS_CATEGORIES.reduce((acc, category) => {
  const categoryInfo = fmsTaxonomyData.taxonomy.find((item) => item.category === category)
  acc[category] = (categoryInfo?.skills || []).map((skill) => skill.name)
  return acc
}, {})

function getSportByName(sportName) {
  return sportsData.sports.find((sport) => sport.name === sportName)
}

function getSportSkillsForContext(sportName, grade = '3학년', space = '운동장') {
  const sportData = getSportByName(sportName)
  if (!sportData?.skills?.length) {
    return []
  }

  const skillIds = new Set(sportData.skills)
  return skillsData.skills
    .filter((skill) => {
      if (!skillIds.has(skill.id)) return false
      if (!skill.gradeRange.includes(grade)) return false
      if (!skill.spaceNeeded.includes(space)) return false
      return true
    })
    .map((skill) => skill.name)
}

function getSportDefaultEquipmentText(sportName) {
  const sportData = getSportByName(sportName)
  if (!sportData?.defaultEquipment?.length) {
    return '공, 콘'
  }
  return sportData.defaultEquipment.join(', ')
}

function getDefaultSportSkills(sportName, grade = '3학년', space = '운동장') {
  const options = getSportSkillsForContext(sportName, grade, space)
  if (options.length === 0) {
    return []
  }

  if (sportName === '축구') {
    const passSkill = options.find((skill) => skill === '패스') || options[0]
    return passSkill ? [passSkill] : []
  }
  return options.slice(0, 2)
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
  const [selectedGrade, setSelectedGrade] = useState(DEFAULT_GRADE)
  const [selectedDomain, setSelectedDomain] = useState('스포츠')
  const [selectedSub, setSelectedSub] = useState('영역형')
  const [selectedSport, setSelectedSport] = useState('축구')
  const [selectedFmsByCategory, setSelectedFmsByCategory] = useState(() => buildDefaultFmsByCategory())
  const [selectedSportSkills, setSelectedSportSkills] = useState(() => getDefaultSportSkills('축구', DEFAULT_GRADE, '운동장'))
  const [selectedSpace, setSelectedSpace] = useState('운동장')
  const [durationMin, setDurationMin] = useState(40)
  const [availableEquipmentText, setAvailableEquipmentText] = useState(() => getSportDefaultEquipmentText('축구'))

  const [generatedCandidates, setGeneratedCandidates] = useState([])
  const [generateMeta, setGenerateMeta] = useState(null)

  const [recommendedActivity, setRecommendedActivity] = useState(null)

  const selectedFmsFocus = useMemo(
    () => uniq(FMS_CATEGORIES.flatMap((category) => selectedFmsByCategory[category] || [])),
    [selectedFmsByCategory]
  )
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
    () => getSportSkillsForContext(selectedSport, selectedGrade, selectedSpace),
    [selectedSport, selectedGrade, selectedSpace]
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
    setAvailableEquipmentText(getSportDefaultEquipmentText(selectedSport) || '공, 콘')
    setSelectedSportSkills((prev) => {
      const available = getSportSkillsForContext(selectedSport, selectedGrade, selectedSpace)
      const kept = (prev || []).filter((skill) => available.includes(skill))
      return kept.length > 0 ? kept : getDefaultSportSkills(selectedSport, selectedGrade, selectedSpace)
    })
  }, [selectedSport, selectedGrade, selectedSpace])

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
    const maxCandidates = MAX_RECOMMENDATION_COUNT

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
      const finalCandidates = activityResult.candidates
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
      const finalCandidates = modularResult.candidates
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
    const legacyCandidates = legacyResult.candidates
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
    sportSkillOptions,
  }
}
