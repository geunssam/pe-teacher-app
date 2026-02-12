import { useEffect, useMemo, useState } from 'react'
import activitiesData from '../data/activities.json'
import fmsTaxonomyData from '../data/fmsTaxonomy.json'
import { generateCandidates } from '../utils/recommend/generateCandidates'

const ACTIVITIES = activitiesData.activities

const GRADES = ['5학년', '6학년']
const DOMAINS = ['스포츠']
const SUB_DOMAINS = ['전략형']
const SPORTS = ['축구', '농구', '피구', '배구']
const LOCATIONS = ['실내', '실외']
const FMS_CATEGORIES = ['이동', '비이동', '조작']

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
}

const DEFAULT_EQUIPMENT_BY_SPORT = {
  축구: '축구공, 콘, 조끼, 팀조끼, 호루라기',
  농구: '농구공, 콘, 조끼, 호루라기',
  피구: '피구공, 콘, 조끼, 팀조끼, 호루라기',
  배구: '배구공, 네트, 콘, 조끼',
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
  return (SPORT_SKILLS_BY_SPORT[sport] || []).slice(0, 2)
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

export function useRecommend() {
  const [selectedGrade, setSelectedGrade] = useState('5학년')
  const [selectedDomain, setSelectedDomain] = useState('스포츠')
  const [selectedSub, setSelectedSub] = useState('전략형')
  const [selectedSport, setSelectedSport] = useState('축구')
  const [selectedFmsByCategory, setSelectedFmsByCategory] = useState(() => buildDefaultFmsByCategory())
  const [selectedSportSkills, setSelectedSportSkills] = useState(() => getDefaultSportSkills('축구'))
  const [selectedLocation, setSelectedLocation] = useState('실외')
  const [durationMin, setDurationMin] = useState(40)
  const [weatherFilter, setWeatherFilter] = useState(false)
  const [availableEquipmentText, setAvailableEquipmentText] = useState('축구공, 콘, 조끼, 호루라기')

  const [generatedCandidates, setGeneratedCandidates] = useState([])
  const [generateMeta, setGenerateMeta] = useState(null)

  const [recommendedActivity, setRecommendedActivity] = useState(null)

  const selectedFmsFocus = useMemo(
    () => uniq(FMS_CATEGORIES.flatMap((category) => selectedFmsByCategory[category] || [])),
    [selectedFmsByCategory]
  )

  const sportSkillOptions = useMemo(
    () => SPORT_SKILLS_BY_SPORT[selectedSport] || [],
    [selectedSport]
  )

  const filteredActivities = useMemo(() => {
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
      }
      const keywords = sportKeywordMap[selectedSport] || []
      filtered = filtered.filter((activity) =>
        keywords.some((keyword) => activity.name.includes(keyword) || activity.desc.includes(keyword))
      )
    }

    if (weatherFilter) {
      filtered = filtered.filter((activity) => activity.rainOk === true)
    }

    return filtered
  }, [selectedGrade, selectedDomain, selectedSub, selectedSport, weatherFilter])

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
    if (domain !== '스포츠') {
      return []
    }
    return SUB_DOMAINS
  }

  const getRandomRecommendation = () => {
    if (filteredActivities.length === 0) {
      const rainOkActivities = ACTIVITIES.filter((activity) => activity.rainOk === true)
      if (rainOkActivities.length === 0) {
        return null
      }

      const random = rainOkActivities[Math.floor(Math.random() * rainOkActivities.length)]
      setRecommendedActivity(random)
      return random
    }

    const random = filteredActivities[Math.floor(Math.random() * filteredActivities.length)]
    setRecommendedActivity(random)
    return random
  }

  const getGeneratedRecommendations = ({ classSize = 24, lessonHistory = [] } = {}) => {
    const location = weatherFilter ? '실내' : selectedLocation

    const request = {
      grade: selectedGrade,
      domain: selectedDomain,
      subDomain: selectedSub,
      sport: selectedSport,
      fmsFocus: selectedFmsFocus,
      sportSkills: selectedSportSkills,
      location,
      durationMin,
      classSize,
      availableEquipment: parseEquipmentText(availableEquipmentText),
      lessonHistory,
    }

    const result = generateCandidates(request)
    setGenerateMeta(result.meta)
    setGeneratedCandidates(result.candidates)

    if (result.candidates.length > 0) {
      setRecommendedActivity(null)
      return {
        mode: 'generated',
        request,
        ...result,
      }
    }

    const fallbackActivity = getRandomRecommendation()
    return {
      mode: 'fallback',
      request,
      candidates: [],
      fallbackActivity,
      meta: result.meta,
    }
  }

  return {
    selectedGrade,
    selectedDomain,
    selectedSub,
    selectedSport,
    selectedFmsByCategory,
    selectedFmsFocus,
    selectedSportSkills,
    selectedLocation,
    durationMin,
    weatherFilter,
    availableEquipmentText,
    filteredActivities,
    generatedCandidates,
    generateMeta,
    recommendedActivity,

    setSelectedGrade,
    setSelectedDomain,
    setSelectedSub,
    setSelectedSport,
    setSelectedLocation,
    setDurationMin,
    setWeatherFilter,
    setAvailableEquipmentText,
    setSelectedFmsByCategory,
    setSelectedSportSkills,
    toggleFmsFocus,
    clearFmsCategory,
    toggleSportSkill,
    getSubDomains,
    getRandomRecommendation,
    getGeneratedRecommendations,

    ACTIVITIES,
    GRADES,
    DOMAINS,
    SUB_DOMAINS,
    SPORTS,
    LOCATIONS,
    FMS_CATEGORIES,
    FMS_OPTIONS_BY_CATEGORY,
    SPORT_SKILLS_BY_SPORT,
    sportSkillOptions,
  }
}
