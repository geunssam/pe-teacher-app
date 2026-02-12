function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '')
}

function includesSoft(haystack, needle) {
  return normalize(haystack).includes(normalize(needle))
}

function calculateFmsScore(candidate, request) {
  if (!request.fmsFocus || request.fmsFocus.length === 0) {
    return 20
  }

  const matched = request.fmsFocus.filter((focus) =>
    candidate.fmsTags.some((tag) => includesSoft(tag, focus) || includesSoft(focus, tag))
  )

  const ratio = matched.length / request.fmsFocus.length
  return Math.round(ratio * 35)
}

function calculateStrategicScore(candidate) {
  const tacticalBonus = Math.min(10, (candidate.tacticalTags?.length || 0) * 2)
  const coreCoverageBonus = Math.min(8, (candidate.coreRules?.length || 0) * 2)
  const transitionBonus = candidate.basicRules.some((rule) => /전환|침투|지원/.test(rule)) ? 7 : 3

  return Math.min(25, tacticalBonus + coreCoverageBonus + transitionBonus)
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

export function scoreCandidate({ candidate, request, validation, lessonHistory }) {
  const fmsScore = calculateFmsScore(candidate, request)
  const strategicScore = calculateStrategicScore(candidate)
  const operationScore = Math.round(((validation?.operationScore || 0) / 100) * 20)
  const noveltyScore = calculateNoveltyScore(candidate)
  const duplicatePenalty = calculateDuplicatePenalty(candidate, lessonHistory)
  const duplicateScore = Math.max(0, 10 - duplicatePenalty)

  const total = Math.max(
    0,
    Math.min(100, fmsScore + strategicScore + operationScore + noveltyScore + duplicateScore)
  )

  return {
    total,
    breakdown: {
      fms: fmsScore,
      strategic: strategicScore,
      operability: operationScore,
      novelty: noveltyScore,
      duplicateAvoidance: duplicateScore,
    },
    duplicatePenalty,
  }
}
