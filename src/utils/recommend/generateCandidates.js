import activityAtomsData from '../../data/activityAtoms.json'
import fmsTaxonomyData from '../../data/fmsTaxonomy.json'
import ruleModifiersData from '../../data/ruleModifiers.json'
import sportCoreRulesData from '../../data/sportCoreRules.json'
import { validateCandidate } from './validateCandidate.js'
import { scoreCandidate } from './scoreCandidate.js'
import { renderTemplate } from './renderTemplate.js'

const MIN_MODIFIER_COUNT = 2
const MAX_MODIFIER_COUNT = 3
const EQUIPMENT_ALIASES = {
  팀조끼: '조끼',
  '팀 조끼': '조끼',
  번호조끼: '조끼',
  '번호 조끼': '조끼',
  조끼: '조끼',
  마커콘: '콘',
  '마커 콘': '콘',
  라인콘: '콘',
  존마커: '콘',
  '존 마커': '콘',
  콘: '콘',
  휘슬: '호루라기',
  호루라기: '호루라기',
  스톱워치: '타이머',
  타이머: '타이머',
}

function uniq(items) {
  return [...new Set(items.filter(Boolean))]
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffle(items) {
  const copied = [...items]
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copied[i], copied[j]] = [copied[j], copied[i]]
  }
  return copied
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '')
}

function includesSoft(haystack, needle) {
  return normalize(haystack).includes(normalize(needle)) || normalize(needle).includes(normalize(haystack))
}

function canonicalEquipmentName(item) {
  const trimmed = String(item ?? '').trim()
  return EQUIPMENT_ALIASES[trimmed] || trimmed
}

function splitAlternatives(requiredItem) {
  return String(requiredItem ?? '')
    .split(/\s*또는\s*|\s*\/\s*|\s*\|\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildEquipmentSet(items = []) {
  const base = uniq((items || []).map((item) => String(item).trim()))
  const expanded = base.flatMap((item) => [item, canonicalEquipmentName(item)])
  return new Set(expanded)
}

function canCoverGenericBall(requiredItem, availableSet, sport) {
  if (requiredItem !== '공') {
    return false
  }

  if (availableSet.has('공')) {
    return true
  }

  const sportBall = {
    축구: '축구공',
    농구: '농구공',
    피구: '피구공',
    배구: '배구공',
  }[sport]

  return sportBall ? availableSet.has(sportBall) : false
}

function isEquipmentSatisfied(requiredItems = [], request = {}) {
  const availableSet = buildEquipmentSet(request.availableEquipment || [])
  if (availableSet.size === 0) {
    return true
  }

  return requiredItems.every((requiredItem) => {
    const alternatives = splitAlternatives(requiredItem)
    return alternatives.some((item) =>
      availableSet.has(item) ||
      availableSet.has(canonicalEquipmentName(item)) ||
      canCoverGenericBall(item, availableSet, request.sport)
    )
  })
}

const fmsAliasMap = fmsTaxonomyData.taxonomy.reduce((acc, category) => {
  category.skills.forEach((skill) => {
    const canonical = skill.name
    acc[normalize(canonical)] = canonical
    ;(skill.aliases || []).forEach((alias) => {
      acc[normalize(alias)] = canonical
    })
  })
  return acc
}, {})
const KNOWN_FMS_SET = new Set(Object.values(fmsAliasMap))

const FMS_TO_ACTIVITY_HINTS = {
  달리기: ['달리기', '뛰기', '가속', '감속', '침투', '전환'],
  '사이드 스텝': ['사이드 스텝', '사이드스텝', '방향전환', '지원'],
  슬라이딩: ['슬라이딩', '방향전환', '커버'],
  '균형 잡기': ['균형', '스쿼트', '정지', '착지'],
  비틀기: ['비틀기', '회전', '피벗'],
  던지기: ['던지기', '패스', '슈팅', '마무리'],
  받기: ['받기', '리시브', '패스', '트랩'],
  차기: ['차기', '킥', '패스', '슈팅'],
  '공 몰기': ['공 몰기', '드리블', '운반', '돌파'],
}

const SPORT_SKILL_HINTS = {
  패스: ['패스', '연계', '지원'],
  드리블: ['드리블', '공 몰기', '돌파'],
  슛: ['슛', '마무리', '타깃'],
  트래핑: ['트래핑', '볼 멈추기', '받기'],
  침투: ['침투', '빈 공간', '가속'],
  '압박 수비': ['압박', '차단', '수비 전환'],
  리바운드: ['리바운드', '2차 플레이'],
  컷인: ['컷인', '침투', '지원'],
  '도움 수비': ['도움 수비', '커버', '협력 수비'],
  던지기: ['던지기', '마무리'],
  받기: ['받기', '리시브'],
  회피: ['회피', '피하기', '방향전환'],
  더블팀: ['더블팀', '협력 수비', '압박'],
  '협력 수비': ['협력 수비', '커버', '전환'],
  리시브: ['리시브', '받기'],
  토스: ['토스', '패스', '연결'],
  서브: ['서브', '시작 조건'],
  스파이크: ['스파이크', '마무리'],
  커버: ['커버', '협력 수비', '복귀'],
  로테이션: ['로테이션', '전환', '공간 분담'],
}

function getFocusHints(focusTags = []) {
  return uniq(
    focusTags.flatMap((focus) => {
      const base = [focus]
      const hints = FMS_TO_ACTIVITY_HINTS[focus] || []
      return [...base, ...hints]
    })
  )
}

function getSportSkillHints(sportSkills = []) {
  return uniq(
    sportSkills.flatMap((skill) => {
      const base = [skill]
      const hints = SPORT_SKILL_HINTS[skill] || []
      return [...base, ...hints]
    })
  )
}

function getAtomSearchableText(atom) {
  return [
    atom.name,
    ...(atom.fmsTags || []),
    ...(atom.tacticalTags || []),
    ...(atom.basicRules || []),
    ...(atom.operationTips || []),
  ].join(' | ')
}

function normalizeFmsTags(tags = []) {
  return uniq(
    tags.map((tag) => {
      const normalized = normalize(tag)
      return fmsAliasMap[normalized] || tag
    })
  )
}

function mapDifficulty(level) {
  if (level <= 1) {
    return '쉬움'
  }
  if (level === 2) {
    return '중간'
  }
  return '도전'
}

function getCandidateAtoms(request) {
  const normalizedFocus = normalizeFmsTags(request.fmsFocus)
  const focusHints = getFocusHints(normalizedFocus)
  const sportSkillHints = getSportSkillHints(request.sportSkills || [])
  const combinedHints = uniq([...focusHints, ...sportSkillHints])
  const allAtoms = activityAtomsData.atoms.filter((atom) =>
    atom.compatibleSports.includes(request.sport) &&
    atom.grades.includes(request.grade) &&
    atom.domain === request.domain &&
    atom.subDomain === request.subDomain
  )

  if (combinedHints.length === 0) {
    return allAtoms
  }

  const fmsMatched = allAtoms.filter((atom) => {
    const searchable = getAtomSearchableText(atom)
    return combinedHints.some((hint) => includesSoft(searchable, hint))
  }
  )

  return fmsMatched.length > 0 ? fmsMatched : allAtoms
}

function getAllowedModifiers(request, coreRule) {
  const forbiddenIds = new Set(coreRule.forbiddenModifierIds || [])
  const forbiddenTags = new Set(coreRule.forbiddenTags || [])

  return ruleModifiersData.modifiers.filter((modifier) => {
    if (!modifier.sportAllow.includes(request.sport)) {
      return false
    }

    if (!modifier.locationAllow.includes(request.location)) {
      return false
    }

    if (forbiddenIds.has(modifier.id)) {
      return false
    }

    if ((modifier.constraintTags || []).some((tag) => forbiddenTags.has(tag))) {
      return false
    }

    return isEquipmentSatisfied(modifier.equipmentNeeded || [], request)
  })
}

function pickModifiers(modifierPool) {
  if (modifierPool.length === 0) {
    return []
  }

  const targetCount = MIN_MODIFIER_COUNT + Math.floor(Math.random() * (MAX_MODIFIER_COUNT - MIN_MODIFIER_COUNT + 1))
  const byType = modifierPool.reduce((acc, modifier) => {
    if (!acc[modifier.type]) {
      acc[modifier.type] = []
    }
    acc[modifier.type].push(modifier)
    return acc
  }, {})

  const selected = []
  const selectedIds = new Set()

  shuffle(Object.keys(byType)).forEach((type) => {
    if (selected.length >= targetCount) {
      return
    }

    const chosen = pickRandom(byType[type])
    if (chosen && !selectedIds.has(chosen.id)) {
      selected.push(chosen)
      selectedIds.add(chosen.id)
    }
  })

  shuffle(modifierPool).forEach((modifier) => {
    if (selected.length >= targetCount) {
      return
    }

    if (!selectedIds.has(modifier.id)) {
      selected.push(modifier)
      selectedIds.add(modifier.id)
    }
  })

  return selected
}

function buildTitle(request, atom, modifiers) {
  const anchorModifier = modifiers[0]?.name || '기본형'
  return `${request.sport} ${atom.name} (${anchorModifier})`
}

function buildCandidate({ request, atom, modifiers, coreRule }) {
  const additionalDuration = modifiers.reduce((sum, modifier) => sum + (modifier.timeDelta || 0), 0)
  const estimatedDurationMin = atom.baseDurationMin + additionalDuration + 8

  const modifierDifficulty = modifiers.reduce((sum, modifier) => sum + (modifier.difficultyDelta || 0), 0)
  const level = Math.max(1, Math.min(3, Math.round(atom.difficultyBase + modifierDifficulty / 2)))

  const penaltiesMissions = modifiers
    .filter((modifier) => modifier.type === '벌칙/미션')
    .map((modifier) => modifier.ruleText)

  const nonPenaltyModifiers = modifiers
    .filter((modifier) => modifier.type !== '벌칙/미션')
    .map((modifier) => `${modifier.type}: ${modifier.ruleText}`)

  const equipment = uniq([
    ...(coreRule.defaultEquipment || []),
    ...(atom.equipment || []),
    ...modifiers.flatMap((modifier) => modifier.equipmentNeeded || []),
  ])

  const youtubeKeyword = `${request.sport} ${atom.youtubeKeyword || atom.name}`
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeKeyword)}`

  const normalizedFocus = normalizeFmsTags(request.fmsFocus)
  const normalizedAtomFms = normalizeFmsTags(atom.fmsTags).filter((tag) => KNOWN_FMS_SET.has(tag))
  const mergedFms = uniq([...normalizedFocus, ...normalizedAtomFms])
  const sportSkillTags = uniq(request.sportSkills || [])
  const explanationFocus = normalizedFocus.length > 0 ? normalizedFocus.join(', ') : '패스/달리기 연계'
  const explanationSportSkill = sportSkillTags.length > 0 ? sportSkillTags.join(', ') : '종목 기본기'

  return {
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: buildTitle(request, atom, modifiers),
    sport: request.sport,
    atomName: atom.name,
    tacticalTags: atom.tacticalTags || [],
    fmsTags: mergedFms,
    sportSkillTags,
    coreRules: coreRule.coreRules,
    location: atom.location,
    modifiers,
    difficulty: mapDifficulty(level),
    basicRules: uniq([...(coreRule.coreRules || []), ...(atom.basicRules || [])]),
    penaltiesMissions: penaltiesMissions.length > 0
      ? penaltiesMissions
      : ['실패 팀은 핵심 동작 1회 복습 후 즉시 재도전한다.'],
    operationTips: uniq([...(atom.operationTips || []), ...nonPenaltyModifiers]),
    educationEffects: uniq([
      ...(atom.educationEffects || []),
      `${explanationFocus} 중심 기술을 전략형 상황에서 통합 적용한다.`,
    ]),
    equipment,
    safetyRules: coreRule.safetyRules || [],
    youtubeUrl,
    estimatedDurationMin,
    explanation: `${request.grade} ${request.sport} 전략형 수업에서 FMS(${explanationFocus})와 종목기술(${explanationSportSkill})을 반영하고, core rule을 유지한 modifier ${modifiers.length}개를 조합한 후보입니다.`,
  }
}

function reorderWithTemplates(candidates) {
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((candidate, index) => {
      const rendered = renderTemplate(candidate, index + 1)
      if (!rendered) {
        return null
      }

      return {
        ...candidate,
        titleWithOrder: rendered.titleWithOrder,
        templateText: rendered.templateText,
      }
    })
    .filter(Boolean)
}

export function generateCandidates(request) {
  const coreRule = sportCoreRulesData.sports[request.sport]
  if (!coreRule) {
    return {
      candidates: [],
      meta: {
        reason: `지원하지 않는 종목: ${request.sport}`,
      },
    }
  }

  const atomPool = getCandidateAtoms(request)
  const modifierPool = getAllowedModifiers(request, coreRule)

  if (atomPool.length === 0) {
    return {
      candidates: [],
      meta: {
        reason: '조건에 맞는 activity atom이 없습니다.',
      },
    }
  }

  const candidates = []
  const seen = new Set()
  const maxAttempts = 100
  let attempts = 0
  const failureReasonCounts = {}

  while (candidates.length < 3 && attempts < maxAttempts) {
    attempts += 1

    const atom = pickRandom(atomPool)
    const modifiers = pickModifiers(modifierPool)
    if (modifiers.length < MIN_MODIFIER_COUNT) {
      continue
    }

    const uniqueKey = `${atom.id}:${modifiers.map((modifier) => modifier.id).sort().join('|')}`
    if (seen.has(uniqueKey)) {
      continue
    }
    seen.add(uniqueKey)

    const candidate = buildCandidate({ request, atom, modifiers, coreRule })
    const validation = validateCandidate({ candidate, request, coreRule })

    if (!validation.valid) {
      validation.reasons.forEach((reason) => {
        failureReasonCounts[reason] = (failureReasonCounts[reason] || 0) + 1
      })
      continue
    }

    const scoring = scoreCandidate({
      candidate,
      request,
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

  const topFailureReasons = Object.entries(failureReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => ({ reason, count }))

  return {
    candidates: reorderWithTemplates(candidates),
    meta: {
      attempts,
      atomPoolCount: atomPool.length,
      modifierPoolCount: modifierPool.length,
      topFailureReasons,
      reason: candidates.length === 0
        ? topFailureReasons[0]?.reason || '조건에 맞는 후보를 생성하지 못했습니다.'
        : undefined,
    },
  }
}
