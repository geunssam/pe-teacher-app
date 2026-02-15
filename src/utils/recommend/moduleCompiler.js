// 모듈 컴파일러 — structure × skill × modifier 슬롯 컴파일 + 호환성 필터 + 슬롯 호환성 검증 | 호출→generateModularCandidates.js, 데이터→data/modules/
import structuresData from '../../data/modules/structures.legacy.json'
import skillsData from '../../data/modules/skills.json'
import modifiersData from '../../data/modules/modifiers.json'
import sportsData from '../../data/modules/sports.json'
import fmsCurriculumData from '../../data/modules/fmsCurriculum.json'
import { isPenaltyType } from './normalizePenalty.js'

function uniq(items) {
  return [...new Set((items || []).filter(Boolean))]
}

/**
 * checkSlotCompatibility(structure, skill)
 * slotKeys.required 슬롯이 skill에 모두 있는지 검증
 * 반환: { compatible, missingRequired, missingOptional, coverage }
 */
export function checkSlotCompatibility(structure, skill) {
  const slotKeys = structure.slotKeys
  // slotKeys 없으면 기존 방식 (모든 slots를 required로 취급)
  const requiredSlots = slotKeys?.required || Object.keys(structure.slots || {})
  const optionalSlots = (slotKeys?.optional || []).map((o) => (typeof o === 'string' ? o : o.key))
  const skillSlots = Object.keys(skill.slotMapping || {})

  const missingRequired = requiredSlots.filter((s) => !skillSlots.includes(s))
  return {
    compatible: missingRequired.length === 0,
    missingRequired,
    missingOptional: optionalSlots.filter((s) => !skillSlots.includes(s)),
    coverage: (requiredSlots.length - missingRequired.length) / Math.max(1, requiredSlots.length),
  }
}

/**
 * sportAllowMatch: 공백 차이를 무시하는 종목명 soft-match
 * "술래놀이" vs "술래 놀이" 등의 공백 불일치 해결
 */
function sportAllowMatch(sportAllow, sportName) {
  const normalized = sportName.replace(/\s/g, '')
  return sportAllow.some((allowed) =>
    allowed === sportName || allowed === '전체' ||
    allowed.replace(/\s/g, '') === normalized
  )
}

/**
 * filterCompatibleModules(request)
 * 입력: { sport, space, grade, fmsFocus, ... }
 * 출력: { structures[], skills[], modifiers[], sport: sportData, gradeConfig }
 */
export function filterCompatibleModules(request) {
  const { sport, space, grade } = request

  const sportData = sportsData.sports.find((s) => s.name === sport)
  if (!sportData) {
    return { structures: [], skills: [], modifiers: [], sport: null, gradeConfig: null }
  }

  const gradeConfig = fmsCurriculumData.gradeProgression[grade]
  if (!gradeConfig) {
    return { structures: [], skills: [], modifiers: [], sport: sportData, gradeConfig: null }
  }

  const allowedPhases = new Set(gradeConfig.allowedPhases)
  const forbiddenIds = new Set(sportData.forbiddenModifierIds || [])
  const sportSkillIds = new Set(sportData.skills || [])

  // structure: space 호환, suitablePhase 허용, preferredPhase 우선
  const preferredPhase = request.preferredPhase || null
  let structures = structuresData.structures.filter((structure) => {
    if (!structure.space.includes(space)) return false
    if (!allowedPhases.has(structure.suitablePhase)) return false
    return true
  })

  // If preferredPhase is set, prefer structures matching that phase
  if (preferredPhase) {
    const preferred = structures.filter((s) => s.suitablePhase === preferredPhase)
    if (preferred.length > 0) structures = preferred
  }

  // skill: sport 일치, grade 포함, space 호환
  const skills = skillsData.skills.filter((skill) => {
    if (skill.sport !== sport) return false
    if (!skill.gradeRange.includes(grade)) return false
    if (!skill.spaceNeeded.includes(space)) return false
    if (!sportSkillIds.has(skill.id)) return false
    return true
  })

  // modifier: sport 허용 (soft-match), space 호환, phase 허용, forbidden 체크
  const modifiers = modifiersData.modifiers.filter((modifier) => {
    if (!sportAllowMatch(modifier.sportAllow, sport)) return false
    if (!modifier.space.includes(space)) return false
    if (!allowedPhases.has(modifier.suitablePhase)) return false
    if (forbiddenIds.has(modifier.id)) return false
    return true
  })

  return { structures, skills, modifiers, sport: sportData, gradeConfig }
}

/**
 * compileActivity(structure, skill, modifiers, sportData)
 * structure.flow의 [슬롯]을 skill.slotMapping으로 치환
 * modifier.slotOverride 덮어씌움
 * optional 슬롯 fallback 적용
 */
export function compileActivity(structure, skill, modifiers = [], sportData) {
  const modifierNarratives = modifiers.map((modifier) => ({
    id: modifier.id,
    name: modifier.name,
    type: modifier.type,
    ruleText: modifier.ruleOverride || modifier.ruleText || '',
    slotOverride: modifier.slotOverride || {},
    equipmentNeeded: modifier.equipmentNeeded || [],
  }))

  // Build final slot mapping: skill base + modifier overrides
  const slotMapping = { ...skill.slotMapping }
  modifierNarratives.forEach((modifier) => {
    if (modifier.slotOverride) {
      Object.entries(modifier.slotOverride).forEach(([key, value]) => {
        if (value) slotMapping[key] = value
      })
    }
  })

  // Build optional fallback map from slotKeys
  const optionalMap = Object.fromEntries(
    (structure.slotKeys?.optional || [])
      .filter((o) => typeof o === 'object' && o.fallback)
      .map((o) => [o.key, o.fallback])
  )

  // Compile flow: replace [슬롯] with mapped values, fallback for optional
  const compiledFlow = structure.flow.map((step) =>
    step.replace(/\[([^\]]+)\]/g, (match, slotName) =>
      slotMapping[slotName] || optionalMap[slotName] || match
    )
  )

  // Slot compatibility check
  const slotCheck = checkSlotCompatibility(structure, skill)

  // Title: {종목} {구조이름} {기술이름} (변형이름)
  const modifierNames = modifierNarratives.map((m) => m.name).filter(Boolean)
  const titleModifierNames = modifierNames.slice(0, Math.min(2, modifierNames.length))
  let modifierSuffix = ''
  if (modifierNames.length === 1) {
    modifierSuffix = ` (${modifierNames[0]})`
  } else if (modifierNames.length === 2) {
    modifierSuffix = ` (${modifierNames[0]} + ${modifierNames[1]})`
  } else if (modifierNames.length >= 3) {
    modifierSuffix = ` (${modifierNames[0]} + ${modifierNames[1]} +${modifierNames.length - 2})`
  }
  const title = `${sportData.name} ${structure.name} ${skill.name}${modifierSuffix}`

  // Equipment merge
  const equipment = uniq([
    ...(sportData.defaultEquipment || []),
    ...(structure.equipment || []),
    ...(skill.equipment || []),
    ...modifiers.flatMap((m) => m.equipmentNeeded || []),
  ])

  // Difficulty calculation
  const modifierDifficulty = modifiers.reduce((sum, m) => sum + (m.difficultyDelta || 0), 0)
  const difficultyLevel = Math.max(1, Math.min(3, Math.round(structure.difficultyBase + modifierDifficulty / 2)))
  const difficulty = difficultyLevel <= 1 ? '쉬움' : difficultyLevel === 2 ? '중간' : '도전'

  // Duration calculation
  const modifierTimeDelta = modifiers.reduce((sum, m) => sum + (m.timeDelta || 0), 0)
  const estimatedDurationMin = structure.baseDurationMin + modifierTimeDelta + 8

  // FMS tags
  const fmsTags = uniq([...skill.fms, ...(structure.compatibleFmsCategories || [])])

  // Build modifier rules
  const penaltiesMissions = modifiers
    .filter((m) => isPenaltyType(m.type))
    .map((m) => m.ruleOverride || m.ruleText)

  const nonPenaltyModifierRules = modifiers
    .filter((m) => !isPenaltyType(m.type))
    .map((m) => `${m.type}: ${m.ruleOverride || m.ruleText}`)

  const modifierDetails = modifierNarratives.map((modifier) =>
    `적용 변형: ${modifier.name} (${modifier.type}) - ${modifier.ruleText}`
  )

  // YouTube keyword
  const youtubeKeyword = `${sportData.name} ${structure.name} ${skill.name} 체육 수업`
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeKeyword)}`

  // Hazard context: merge extra safety rules if structure+skill pattern matches
  let extraSafetyRules = []
  if (sportData.hazardContexts) {
    sportData.hazardContexts.forEach((ctx) => {
      const structureMatch = (ctx.structurePatterns || []).includes(structure.id)
      const skillMatch = (ctx.skillPatterns || []).includes(skill.id)
      if (structureMatch && skillMatch) {
        extraSafetyRules = [...extraSafetyRules, ...(ctx.extraSafetyRules || [])]
      }
    })
  }

  return {
    id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    sport: sportData.name,
    structureId: structure.id,
    structureName: structure.name,
    skillId: skill.id,
    skillName: skill.name,
    modifiers,
    modifierNarratives,
    titleModifierNames,
    modifierDetails,
    modifierBodyContractVersion: 'v1',
    fmsTags,
    sportSkillTags: [skill.name],
    teachingCues: skill.teachingCues || [],
    commonErrors: skill.commonErrors || [],
    quickFixes: skill.quickFixes || [],
    challengeRules: skill.challengeRules || [],
    closureGameRules: skill.closureGameRules || [],
    tacticalTags: [],
    difficulty,
    difficultyLevel,
    compiledFlow,
    basicRules: uniq([...(sportData.coreRules || []), ...compiledFlow]),
    penaltiesMissions: penaltiesMissions.length > 0
      ? penaltiesMissions
      : ['실패 시 핵심 동작 1회 복습 후 즉시 재도전한다.'],
    operationTips: uniq([...(structure.teachingTips || []), ...nonPenaltyModifierRules]),
    educationEffects: [
      `${skill.name} 기술을 ${structure.name} 구조에서 반복 적용하여 실전 적용력을 높인다.`,
      `${skill.fmsCategory || '조작'} 움직임을 전략적 상황에서 통합 적용한다.`,
    ],
    equipment,
    safetyRules: uniq([...(sportData.safetyRules || []), ...extraSafetyRules]),
    location: structure.space,
    youtubeUrl,
    estimatedDurationMin,
    explanation: `${structure.name} 구조에 ${skill.name} 기술을 조합하고 modifier ${modifiers.length}개를 적용한 모듈형 후보입니다.`,
    coreRules: sportData.coreRules || [],
    atomName: skill.name,
    // 교사 번역 시스템 지원 필드
    slotCoverage: slotCheck.coverage,
    gradeLevelHint: skill.gradeLevelHint || {},
    editableFields: structure.editableFields || null,
  }
}
