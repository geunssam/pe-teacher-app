// 후보 유효성 검증 — 시간/장소/안전/장비/핵심개념 체크 + operationScore 산출 | 호출→generateCandidates.js, 종목규칙→data/sportCoreRules.json
const MAX_DURATION_MIN = 50
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
  '티볼 공': '티볼공',
  '발야구 공': '발야구공',
  프리스비: '프리스비',
  '플라잉 디스크': '프리스비',
  플라잉디스크: '프리스비',
  비치볼: '비치볼',
  '비치 볼': '비치볼',
  줄넘기줄: '줄넘기줄',
  '줄넘기 줄': '줄넘기줄',
  긴줄: '긴줄',
  '긴 줄': '긴줄',
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '')
}

function uniq(items) {
  return [...new Set(items.filter(Boolean))]
}

function normalizeEquipment(items) {
  return uniq((items || []).map((item) => String(item).trim()))
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
    티볼: '티볼공',
    발야구: '발야구공',
    빅발리볼: '비치볼',
    플라잉디스크: '프리스비',
    줄넘기: '줄넘기줄',
  }[sport]

  return sportBall ? availableSet.has(sportBall) : false
}

function buildEquipmentSet(items = []) {
  const base = normalizeEquipment(items)
  const expanded = base.flatMap((item) => [item, canonicalEquipmentName(item)])
  return new Set(expanded)
}

function hasEquipment(requiredItem, availableSet, sport) {
  const alternatives = splitAlternatives(requiredItem)

  return alternatives.some((item) => {
    if (availableSet.has(item) || availableSet.has(canonicalEquipmentName(item))) {
      return true
    }

    return canCoverGenericBall(item, availableSet, sport)
  })
}

export function validateCandidate({ candidate, request, coreRule }) {
  const reasons = []
  const requiredSections = [
    'basicRules',
    'penaltiesMissions',
    'operationTips',
    'educationEffects',
    'equipment',
  ]

  requiredSections.forEach((key) => {
    if (!Array.isArray(candidate[key]) || candidate[key].length === 0) {
      reasons.push(`필수 항목 누락: ${key}`)
    }
  })

  const maxDuration = Math.min(request.durationMin || MAX_DURATION_MIN, MAX_DURATION_MIN)
  if ((candidate.estimatedDurationMin || 0) > maxDuration) {
    reasons.push(`시간 초과: ${candidate.estimatedDurationMin}분 > ${maxDuration}분`)
  }

  if (!candidate.location.includes(request.location)) {
    reasons.push(`장소 불일치: ${request.location} 운영 불가`)
  }

  if (!candidate.safetyRules || candidate.safetyRules.length === 0) {
    reasons.push('안전 규칙 누락')
  }

  const candidateModifiers = Array.isArray(candidate.modifiers) ? candidate.modifiers : []
  const modifierIds = candidateModifiers.map((modifier) => modifier.id)
  const modifierNarratives = Array.isArray(candidate.modifierNarratives) ? candidate.modifierNarratives : []
  const titleModifierNames = Array.isArray(candidate.titleModifierNames) ? candidate.titleModifierNames : []
  const modifierDetails = Array.isArray(candidate.modifierDetails) ? candidate.modifierDetails : []

  if (candidateModifiers.length > 0) {
    if (modifierNarratives.length !== candidateModifiers.length) {
      reasons.push('제목-본문 동기화 실패: modifier narrative 누락')
    }

    const modifierNarrativeIdSet = new Set(modifierNarratives.map((modifier) => modifier.id))
    if (candidateModifiers.some((modifier) => !modifierNarrativeIdSet.has(modifier.id))) {
      reasons.push('제목-본문 동기화 실패: modifier id 불일치')
    }

    if (modifierNarratives.some((modifier) => !modifier.name || !modifier.ruleText)) {
      reasons.push('제목-본문 동기화 실패: modifier 이름/규칙 누락')
    }

    if (titleModifierNames.length === 0) {
      reasons.push('제목-본문 동기화 실패: 제목 modifier 누락')
    }

    const modifierNameSet = new Set(modifierNarratives.map((modifier) => normalizeText(modifier.name)))
    if (titleModifierNames.some((name) => !modifierNameSet.has(normalizeText(name)))) {
      reasons.push('제목-본문 동기화 실패: 제목 modifier 불일치')
    }

    const bodyText = [
      ...(candidate.operationTips || []),
      ...(candidate.penaltiesMissions || []),
      ...modifierDetails,
    ]
      .map((line) => normalizeText(line))
      .join('|')

    titleModifierNames.forEach((titleModifierName) => {
      const normalizedName = normalizeText(titleModifierName)
      const narrative = modifierNarratives.find(
        (modifier) => normalizeText(modifier.name) === normalizedName
      )
      if (!narrative) {
        return
      }
      if (!bodyText.includes(normalizeText(narrative.ruleText))) {
        reasons.push(`제목-본문 동기화 실패: ${titleModifierName} 규칙 본문 누락`)
      }
    })
  }

  const blockedIds = new Set(coreRule.forbiddenModifierIds || [])
  if (modifierIds.some((id) => blockedIds.has(id))) {
    reasons.push('종목 Core Rule을 침해하는 modifier 포함')
  }

  const forbiddenTags = new Set(coreRule.forbiddenTags || [])
  const hasForbiddenTag = candidateModifiers.some((modifier) =>
    (modifier.constraintTags || []).some((tag) => forbiddenTags.has(tag))
  )
  if (hasForbiddenTag) {
    reasons.push('종목 핵심 규칙과 충돌하는 제약 태그 포함')
  }

  const requiredEquipment = normalizeEquipment(candidate.equipment)
  const availableEquipment = normalizeEquipment(request.availableEquipment)
  const availableSet = buildEquipmentSet(availableEquipment)

  const missingEquipment = requiredEquipment.filter((item) => {
    if (availableSet.size === 0) {
      return false
    }

    if (availableSet.has(item)) {
      return false
    }

    return !hasEquipment(item, availableSet, request.sport)
  })

  if (missingEquipment.length > 0) {
    reasons.push(`준비물 부족: ${missingEquipment.join(', ')}`)
  }

  const fuzzyCoreMatch = (coreRule.requiredConcepts || []).every((concept) => {
    const normalizedConcept = normalizeText(concept)
    const searchable = [
      ...candidate.fmsTags,
      ...(candidate.sportSkillTags || []),
      ...(candidate.tacticalTags || []),
      ...candidate.basicRules,
      ...candidate.operationTips,
      ...(candidate.educationEffects || []),
    ]
      .map((line) => normalizeText(line))
      .join('|')

    if (searchable.includes(normalizedConcept)) {
      return true
    }

    const conceptTokens = String(concept)
      .split(/\s+/)
      .map((token) => normalizeText(token))
      .filter((token) => token.length >= 2)

    if (conceptTokens.length === 0) {
      return false
    }

    return conceptTokens.some((token) => searchable.includes(token))
  })

  if (!fuzzyCoreMatch) {
    reasons.push('핵심 개념 반영 부족')
  }

  const operationScoreBase = 100
  const durationPenalty = (candidate.estimatedDurationMin || 0) > maxDuration ? 25 : 0
  const locationPenalty = candidate.location.includes(request.location) ? 0 : 25
  const equipmentPenalty = missingEquipment.length > 0 ? Math.min(20, missingEquipment.length * 5) : 0
  const corePenalty = (blockedIds.size > 0 && modifierIds.some((id) => blockedIds.has(id))) || hasForbiddenTag ? 30 : 0

  const operationScore = Math.max(
    0,
    operationScoreBase - durationPenalty - locationPenalty - equipmentPenalty - corePenalty
  )

  return {
    valid: reasons.length === 0,
    reasons,
    missingEquipment,
    operationScore,
  }
}
