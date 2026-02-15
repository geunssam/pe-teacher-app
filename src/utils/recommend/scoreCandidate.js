// 후보 점수 산출 — FMS(35) + 전략(20) + 운영(20) + 신선도(10) + 중복방지(10) + 슬롯커버리지(5) | 호출→generateCandidates.js, FMS분류→data/fmsTaxonomy.json
function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '')
}

function includesSoft(haystack, needle) {
  return normalize(haystack).includes(normalize(needle))
}

// FMS 점수 35점: 매칭(20) + 다양성(10) + 학년적합성(5)
function calculateFmsScore(candidate, request) {
  // 매칭 점수 (20점)
  let matchScore = 0
  if (!request.fmsFocus || request.fmsFocus.length === 0) {
    matchScore = 12
  } else {
    const matched = request.fmsFocus.filter((focus) =>
      candidate.fmsTags.some((tag) => includesSoft(tag, focus) || includesSoft(focus, tag))
    )
    const ratio = matched.length / request.fmsFocus.length
    matchScore = Math.round(ratio * 20)
  }

  // 다양성 보너스 (10점): 이동/비이동/조작 중 몇 카테고리 커버
  const fmsCategorySet = new Set()
  const categoryKeywords = {
    이동: ['이동', '달리기', '사이드 스텝', '슬라이딩', '호핑', '점핑'],
    비이동: ['비이동', '균형', '밸런스', '스트레칭'],
    조작: ['조작', '차기', '던지기', '받기', '치기', '공 몰기', '튀기기', '볼 멈추기', '되받아치기'],
  }

  ;(candidate.fmsTags || []).forEach((tag) => {
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      if (keywords.some((kw) => includesSoft(tag, kw))) {
        fmsCategorySet.add(category)
      }
    })
  })
  const diversityScore = Math.min(10, fmsCategorySet.size * 4)

  // 학년 적합성 (5점): gradeLevelHint가 있고 현재 학년에 힌트가 있으면 보너스
  let gradeScore = 0
  const grade = request.grade || ''
  if (candidate.gradeLevelHint && Object.keys(candidate.gradeLevelHint).length > 0) {
    if (candidate.gradeLevelHint[grade]) {
      gradeScore = 5
    } else {
      gradeScore = 2
    }
  }

  return Math.min(35, matchScore + diversityScore + gradeScore)
}

// 전략 점수 25→20점
function calculateStrategicScore(candidate) {
  const tacticalBonus = Math.min(8, (candidate.tacticalTags?.length || 0) * 2)
  const coreCoverageBonus = Math.min(6, (candidate.coreRules?.length || 0) * 2)
  const transitionBonus = candidate.basicRules.some((rule) => /전환|침투|지원/.test(rule)) ? 6 : 2

  return Math.min(20, tacticalBonus + coreCoverageBonus + transitionBonus)
}

function calculateNoveltyScore(candidate) {
  const avgNovelty =
    candidate.modifiers.length > 0
      ? candidate.modifiers.reduce((sum, modifier) => sum + (modifier.novelty || 0), 0) /
        candidate.modifiers.length
      : 1

  const typeDiversity = new Set(candidate.modifiers.map((modifier) => modifier.type)).size
  const diversityBonus = Math.min(4, typeDiversity)
  return Math.min(10, Math.round(avgNovelty + diversityBonus))
}

function calculateDuplicatePenalty(candidate, lessonHistory = []) {
  if (!lessonHistory || lessonHistory.length === 0) {
    return 0
  }

  const normalizedTitle = normalize(candidate.title)
  const atomName = normalize(candidate.atomName)

  let penalty = 0
  lessonHistory.forEach((entry) => {
    const normalizedEntry = normalize(entry)
    if (!normalizedEntry) {
      return
    }

    if (normalizedEntry.includes(normalizedTitle) || normalizedTitle.includes(normalizedEntry)) {
      penalty += 7
      return
    }

    if (atomName && normalizedEntry.includes(atomName)) {
      penalty += 4
    }
  })

  return Math.min(10, penalty)
}

// 슬롯 커버리지 점수 (5점 신규)
function calculateSlotCoverageScore(candidate) {
  const coverage = candidate.slotCoverage ?? 1
  return Math.round(coverage * 5)
}

export function scoreCandidate({ candidate, request, validation, lessonHistory }) {
  const fmsScore = calculateFmsScore(candidate, request)
  const strategicScore = calculateStrategicScore(candidate)
  const operationScore = Math.round(((validation?.operationScore || 0) / 100) * 20)
  const noveltyScore = calculateNoveltyScore(candidate)
  const duplicatePenalty = calculateDuplicatePenalty(candidate, lessonHistory)
  const duplicateScore = Math.max(0, 10 - duplicatePenalty)
  const slotCoverageScore = calculateSlotCoverageScore(candidate)

  const total = Math.max(
    0,
    Math.min(100, fmsScore + strategicScore + operationScore + noveltyScore + duplicateScore + slotCoverageScore)
  )

  return {
    total,
    breakdown: {
      fms: fmsScore,
      strategic: strategicScore,
      operability: operationScore,
      novelty: noveltyScore,
      duplicateAvoidance: duplicateScore,
      slotCoverage: slotCoverageScore,
    },
    duplicatePenalty,
  }
}
