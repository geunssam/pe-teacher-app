// CSV 기반 활동 직접 서빙 엔진 — activities.json 활동을 필터/셔플/modifier 부착 → validate → score → 상위 3개 | 호출→hooks/useRecommend.js
import activitiesData from '../../data/modules/activities.json'
import skillsData from '../../data/modules/skills.json'
import sportsData from '../../data/modules/sports.json'
import modifiersData from '../../data/modules/modifiers.json'
import fmsCurriculumData from '../../data/modules/fmsCurriculum.json'
import { validateCandidate } from './validateCandidate.js'
import { scoreCandidate } from './scoreCandidate.js'
import { renderTemplate } from './renderTemplate.js'
import { isPenaltyType } from './normalizePenalty.js'

// ─── Activity → Sport mapping ───
// DEPRECATED: fallback — activity.sportId 필드 우선 사용, 없으면 이 맵으로 fallback
const ACTIVITY_SPORT_MAP = {
  one_foot_tag_game: 'tag_chase_play',
  pearl_shell_game: 'tag_chase_play',
  short_track_game: 'tag_chase_play',
  chair_escape_game: 'tag_chase_play',
  zombie_tag: 'tag_chase_play',
  rainbow_tag: 'tag_chase_play',
  exercise_task_tag: 'tag_chase_play',
  elephant_tag: 'tag_chase_play',
  classroom_dodgeball_game: 'dodge_touch',
  touch_dodgeball_class: 'dodge_touch',
  cross_turn_play: 'traditional_play',
  one_leg_jump_play: 'traditional_play',
  eight_shape_play: 'traditional_play',
  squid_play: 'traditional_play',
  cup_flip_speed_samok: 'cup_stacking_play',
  cup_volleyball_class: 'cup_volleyball',
  gaga_ball_mine: 'gaga_ball',
  all_touch_hand_jokgu: 'hand_jokgu',
  finger_baseball_2v2: 'finger_baseball',
  finger_volleyball_2v2: 'finger_volleyball',
}

function uniq(items) {
  return [...new Set((items || []).filter(Boolean))]
}

function shuffle(items) {
  const copied = [...items]
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copied[i], copied[j]] = [copied[j], copied[i]]
  }
  return copied
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function pickModifiers(pool, maxCount) {
  if (pool.length === 0 || maxCount === 0) return []
  const count = Math.min(maxCount, pool.length)
  const target = 1 + Math.floor(Math.random() * count)

  const byType = pool.reduce((acc, m) => {
    if (!acc[m.type]) acc[m.type] = []
    acc[m.type].push(m)
    return acc
  }, {})

  const selected = []
  const selectedIds = new Set()
  const incompatibleIds = new Set()

  shuffle(Object.keys(byType)).forEach((type) => {
    if (selected.length >= target) return
    const candidates = byType[type].filter(
      (m) => !selectedIds.has(m.id) && !incompatibleIds.has(m.id)
    )
    if (candidates.length === 0) return
    const chosen = pickRandom(candidates)
    selected.push(chosen)
    selectedIds.add(chosen.id)
    ;(chosen.incompatibleWith || []).forEach((id) => incompatibleIds.add(id))
  })

  shuffle(pool).forEach((m) => {
    if (selected.length >= target) return
    if (!selectedIds.has(m.id) && !incompatibleIds.has(m.id)) {
      selected.push(m)
      selectedIds.add(m.id)
      ;(m.incompatibleWith || []).forEach((id) => incompatibleIds.add(id))
    }
  })

  return selected
}

/**
 * filterActivities(request)
 * request: { grade, sport, space, fmsFocus, durationMin }
 * Returns filtered activities, matched sport, skills, modifiers
 */
function filterActivities(request) {
  const { grade, sport: sportName, space } = request
  const gradeConfig = fmsCurriculumData.gradeProgression?.[grade]
  if (!gradeConfig) return { activities: [], sport: null, skills: [], modifiers: [], gradeConfig: null }

  const allowedPhases = new Set(gradeConfig.allowedPhases)

  // Find matching sport (by name)
  const sportData = sportsData.sports.find((s) => s.name === sportName)
  if (!sportData) return { activities: [], sport: null, skills: [], modifiers: [], gradeConfig }

  // Find activities that map to this sport (sportId field preferred, ACTIVITY_SPORT_MAP fallback)
  const sportId = sportData.id

  // Filter activities: space + phase + sport match
  const activities = activitiesData.activities.filter((activity) => {
    if (!activity.space.includes(space)) return false
    if (!allowedPhases.has(activity.suitablePhase)) return false
    // sportId field (from CSV) takes priority, ACTIVITY_SPORT_MAP is fallback
    const activitySportId = activity.sportId || ACTIVITY_SPORT_MAP[activity.id]
    if (activitySportId !== sportId) return false
    return true
  })

  // Filter skills for this sport + grade + space
  const sportSkillIds = new Set(sportData.skills || [])
  const skills = skillsData.skills.filter((skill) => {
    if (skill.sport !== sportName) return false
    if (!skill.gradeRange.includes(grade)) return false
    if (!skill.spaceNeeded.includes(space)) return false
    if (!sportSkillIds.has(skill.id)) return false
    return true
  })

  // Filter modifiers: sport allow, space, phase
  const forbiddenIds = new Set(sportData.forbiddenModifierIds || [])
  const modifiers = modifiersData.modifiers.filter((modifier) => {
    // sportAllow uses Korean sport names for older modifiers, handle both
    const sportAllowMatch = modifier.sportAllow.some((s) =>
      s === sportName || s === sportData.name || s === '전체' ||
      // Also match partial names (e.g. "술래놀이" for "술래 놀이")
      sportName.replace(/\s/g, '').includes(s.replace(/\s/g, ''))
    )
    if (!sportAllowMatch) return false
    if (!modifier.space.includes(space)) return false
    if (!allowedPhases.has(modifier.suitablePhase)) return false
    if (forbiddenIds.has(modifier.id)) return false
    return true
  })

  return { activities, sport: sportData, skills, modifiers, gradeConfig }
}

/**
 * buildActivityCandidate(activity, sport, skills, modifiers)
 * Build a candidate from a CSV activity (no slot compilation needed)
 */
function buildActivityCandidate(activity, sportData, skills, selectedModifiers) {
  const modifierNarratives = selectedModifiers.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type,
    ruleText: m.ruleOverride || '',
    slotOverride: m.slotOverride || {},
    equipmentNeeded: m.equipmentNeeded || [],
  }))

  const modifierNames = modifierNarratives.map((m) => m.name).filter(Boolean)
  const titleModifierNames = modifierNames.slice(0, 2)
  let modifierSuffix = ''
  if (modifierNames.length === 1) modifierSuffix = ` (${modifierNames[0]})`
  else if (modifierNames.length === 2) modifierSuffix = ` (${modifierNames[0]} + ${modifierNames[1]})`
  else if (modifierNames.length >= 3) modifierSuffix = ` (${modifierNames[0]} + ${modifierNames[1]} +${modifierNames.length - 2})`

  const title = `${sportData.name} ${activity.name}${modifierSuffix}`

  // Equipment merge
  const equipment = uniq([
    ...(sportData.defaultEquipment || []),
    ...(activity.equipment || []),
    ...selectedModifiers.flatMap((m) => m.equipmentNeeded || []),
  ])

  // Difficulty
  const modDiff = selectedModifiers.reduce((sum, m) => sum + (m.difficultyDelta || 0), 0)
  const difficultyLevel = Math.max(1, Math.min(3, Math.round(activity.difficultyBase + modDiff / 2)))
  const difficulty = difficultyLevel <= 1 ? '쉬움' : difficultyLevel === 2 ? '중간' : '도전'

  // Duration
  const modTime = selectedModifiers.reduce((sum, m) => sum + (m.timeDelta || 0), 0)
  const estimatedDurationMin = activity.baseDurationMin + modTime + 8

  // FMS tags
  const fmsTags = uniq([...(activity.compatibleFmsCategories || [])])

  // Teaching cues from skills
  const allTeachingCues = skills.flatMap((s) => s.teachingCues || [])
  const allCommonErrors = skills.flatMap((s) => s.commonErrors || [])
  const allQuickFixes = skills.flatMap((s) => s.quickFixes || [])
  const allChallengeRules = skills.flatMap((s) => s.challengeRules || [])
  const allClosureGameRules = skills.flatMap((s) => s.closureGameRules || [])
  const sportSkillTags = skills.map((s) => s.name)

  // Modifier details
  const modifierDetails = modifierNarratives.map((m) =>
    `적용 변형: ${m.name} (${m.type}) - ${m.ruleText}`
  )

  const penaltiesMissions = selectedModifiers
    .filter((m) => isPenaltyType(m.type))
    .map((m) => m.ruleOverride || m.ruleText)

  const nonPenaltyRules = selectedModifiers
    .filter((m) => !isPenaltyType(m.type))
    .map((m) => `${m.type}: ${m.ruleOverride || ''}`)

  // Teacher meaning / setup / scoring from modifiers
  const teacherMeaning = selectedModifiers.map((m) => m.teacherMeaning).filter(Boolean)
  const setupExamples = selectedModifiers.map((m) => m.setupExample).filter(Boolean)
  const scoringExamples = selectedModifiers.map((m) => m.scoringExample).filter(Boolean)

  // YouTube
  const youtubeKeyword = `${sportData.name} ${activity.name} 체육 수업`
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeKeyword)}`

  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    sport: sportData.name,
    activityId: activity.id,
    activityName: activity.name,
    structureId: activity.id,
    structureName: activity.name,
    skillId: skills[0]?.id || null,
    skillName: skills[0]?.name || '',
    modifiers: selectedModifiers,
    modifierNarratives,
    titleModifierNames,
    modifierDetails,
    fmsTags,
    sportSkillTags,
    teachingCues: allTeachingCues.slice(0, 4),
    commonErrors: allCommonErrors.slice(0, 3),
    quickFixes: allQuickFixes.slice(0, 3),
    challengeRules: allChallengeRules.slice(0, 2),
    closureGameRules: allClosureGameRules.slice(0, 2),
    difficulty,
    difficultyLevel,
    compiledFlow: activity.flow,
    basicRules: uniq([...(sportData.coreRules || []), ...activity.flow]),
    penaltiesMissions: penaltiesMissions.length > 0
      ? penaltiesMissions
      : ['실패 시 핵심 동작 1회 복습 후 즉시 재도전한다.'],
    operationTips: uniq([...(activity.teachingTips || []), ...nonPenaltyRules]),
    educationEffects: [
      `${activity.name} 활동으로 ${(activity.compatibleFmsCategories || []).join(', ')} 움직임을 통합 적용한다.`,
      ...(skills.length > 0
        ? [`${skills[0].name} 기술을 게임 상황에서 반복 적용하여 실전 적용력을 높인다.`]
        : []),
    ],
    equipment,
    safetyRules: uniq(sportData.safetyRules || []),
    location: activity.space,
    youtubeUrl,
    estimatedDurationMin,
    explanation: `${activity.name} 활동에 modifier ${selectedModifiers.length}개를 적용한 CSV 기반 후보입니다.`,
    coreRules: sportData.coreRules || [],
    atomName: activity.name,
    // New fields for teacher guidance
    teacherMeaning,
    setupExamples,
    scoringExamples,
  }
}

/**
 * hasActivitiesForSport(sportName)
 * UI 가드용: 해당 종목에 매칭되는 CSV 활동이 하나라도 있는지 확인
 */
export function hasActivitiesForSport(sportName) {
  const sportData = sportsData.sports.find((s) => s.name === sportName)
  if (!sportData) return false
  return activitiesData.activities.some((a) =>
    (a.sportId === sportData.id) || (ACTIVITY_SPORT_MAP[a.id] === sportData.id)
  )
}

/**
 * generateActivityCandidates(request)
 * Main entry: filter → shuffle → attach modifiers → validate → score → top 3
 */
export function generateActivityCandidates(request) {
  const { activities, sport: sportData, skills, modifiers, gradeConfig } = filterActivities(request)
  const requestedMaxCandidates = Number(request.maxCandidates)
  const maxCandidates = Number.isFinite(requestedMaxCandidates) && requestedMaxCandidates > 0
    ? requestedMaxCandidates
    : 20

  if (!sportData) {
    return {
      candidates: [],
      meta: { engine: 'activity-csv', reason: `지원하지 않는 종목: ${request.sport}`, topFailureReasons: [] },
    }
  }

  if (!gradeConfig) {
    return {
      candidates: [],
      meta: { engine: 'activity-csv', reason: `지원하지 않는 학년: ${request.grade}`, topFailureReasons: [] },
    }
  }

  if (activities.length === 0) {
    return {
      candidates: [],
      meta: {
        engine: 'activity-csv',
        reason: '조건에 맞는 활동이 없습니다.',
        sportId: sportData.id,
        skillCount: skills.length,
        topFailureReasons: [],
      },
    }
  }

  const maxModifierCount = gradeConfig.maxModifierCount || 0
  const coreRule = {
    coreRules: sportData.coreRules,
    requiredConcepts: sportData.requiredConcepts,
    forbiddenModifierIds: sportData.forbiddenModifierIds,
    forbiddenTags: sportData.forbiddenTags,
    safetyRules: sportData.safetyRules,
    defaultEquipment: sportData.defaultEquipment,
  }

  const candidates = []
  const seen = new Set()
  const failureReasons = {}
  const shuffledActivities = shuffle(activities)
  const maxAttempts = Math.max(activities.length, activities.length * 3)
  let attempts = 0

  for (const activity of shuffledActivities) {
    if (candidates.length >= maxCandidates) break
    if (attempts >= maxAttempts) break
    attempts++

    const selectedMods = pickModifiers(modifiers, maxModifierCount)
    const uniqueKey = `${activity.id}:${selectedMods.map((m) => m.id).sort().join('|')}`
    if (seen.has(uniqueKey)) continue
    seen.add(uniqueKey)

    const candidate = buildActivityCandidate(activity, sportData, skills, selectedMods)

    const validationRequest = { ...request, location: request.space }
    const validation = validateCandidate({ candidate, request: validationRequest, coreRule })

    if (!validation.valid) {
      validation.reasons.forEach((r) => { failureReasons[r] = (failureReasons[r] || 0) + 1 })
      continue
    }

    const scoring = scoreCandidate({
      candidate,
      request: validationRequest,
      validation,
      lessonHistory: request.lessonHistory || [],
    })

    candidates.push({
      ...candidate,
      score: scoring.total,
      scoreBreakdown: scoring.breakdown,
      duplicatePenalty: scoring.duplicatePenalty,
      validation,
    })
  }

  const topCandidates = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates)
    .map((candidate, index) => {
      const rendered = renderTemplate(candidate, index + 1)
      if (!rendered) return candidate
      return { ...candidate, titleWithOrder: rendered.titleWithOrder, templateText: rendered.templateText }
    })

  const topFailureReasons = Object.entries(failureReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => ({ reason, count }))

  return {
    candidates: topCandidates,
    meta: {
      engine: 'activity-csv',
      attempts,
      activityCount: activities.length,
      skillCount: skills.length,
      modifierCount: modifiers.length,
      topFailureReasons,
      reason: topCandidates.length === 0
        ? topFailureReasons[0]?.reason || '조건에 맞는 후보를 생성하지 못했습니다.'
        : undefined,
    },
  }
}
