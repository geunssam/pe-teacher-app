// 모듈 기반 후보 생성기 — structure × skill 호환 페어 → modifier 부착 → 컴파일 → 검증 → 점수 → 상위 3개 | 호출→hooks/useRecommend.js, 엔진→moduleCompiler.js
import { filterCompatibleModules, compileActivity, checkSlotCompatibility } from './moduleCompiler.js'
import { validateCandidate } from './validateCandidate.js'
import { scoreCandidate } from './scoreCandidate.js'
import { renderTemplate } from './renderTemplate.js'

function normalizeText(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '')
}

function includesSoft(haystack, needle) {
  return normalizeText(haystack).includes(normalizeText(needle))
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

function pickModifiers(modifierPool, maxCount) {
  if (modifierPool.length === 0 || maxCount === 0) return []

  const count = Math.min(maxCount, modifierPool.length)
  const target = 1 + Math.floor(Math.random() * count)

  // Try to pick from different types
  const byType = modifierPool.reduce((acc, m) => {
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

  // Fill remaining if needed
  shuffle(modifierPool).forEach((m) => {
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
 * generateModularCandidates(request)
 * request: { sport, space, grade, fmsFocus, sportSkills, durationMin, classSize, availableEquipment, lessonHistory }
 *
 * 1. filterCompatibleModules
 * 2. structure × skill 호환 페어 생성
 * 3. modifier 0~maxModifierCount개 부착
 * 4. compileActivity로 조립
 * 5. validateCandidate로 검증
 * 6. scoreCandidate로 점수
 * 7. 상위 3개 반환
 */
export function generateModularCandidates(request) {
  const { structures: allStructures, skills, modifiers, sport: sportData, gradeConfig } = filterCompatibleModules(request)
  const requestedSportSkills = (request.sportSkills || []).filter(Boolean)
  const requestedMaxCandidates = Number(request.maxCandidates)
  const maxCandidates = Number.isFinite(requestedMaxCandidates) && requestedMaxCandidates > 0
    ? requestedMaxCandidates
    : 20

  // Apply preferred structure filter if provided
  let structures = allStructures
  if (request.preferredStructureIds?.length > 0) {
    const preferredSet = new Set(request.preferredStructureIds)
    const filtered = allStructures.filter((s) => preferredSet.has(s.id))
    if (filtered.length > 0) structures = filtered
  }

  if (!sportData) {
    return {
      candidates: [],
      meta: { engine: 'modular', reason: `지원하지 않는 종목: ${request.sport}`, topFailureReasons: [] },
    }
  }

  if (!gradeConfig) {
    return {
      candidates: [],
      meta: { engine: 'modular', reason: `지원하지 않는 학년: ${request.grade}`, topFailureReasons: [] },
    }
  }

  if (structures.length === 0) {
    return {
      candidates: [],
      meta: { engine: 'modular', reason: '조건에 맞는 구조(structure)가 없습니다.', topFailureReasons: [] },
    }
  }

  if (skills.length === 0) {
    return {
      candidates: [],
      meta: { engine: 'modular', reason: '조건에 맞는 기술(skill)이 없습니다.', topFailureReasons: [] },
    }
  }

  const matchedSkills = requestedSportSkills.length > 0
    ? skills.filter((skill) =>
      requestedSportSkills.some(
        (requested) => includesSoft(skill.name, requested) || includesSoft(requested, skill.name)
      )
    )
    : skills
  const candidateSkills = matchedSkills.length > 0 ? matchedSkills : skills

  // Generate all structure × skill pairs
  const pairs = []
  structures.forEach((structure) => {
    candidateSkills.forEach((skill) => {
      // Check fmsCategory compatibility
      const fmsCompatible = structure.compatibleFmsCategories.includes(skill.fmsCategory)
      if (!fmsCompatible) return

      // Check slot compatibility (required slots must exist in skill)
      const slotCheck = checkSlotCompatibility(structure, skill)
      if (!slotCheck.compatible) return

      pairs.push({ structure, skill, slotCoverage: slotCheck.coverage })
    })
  })

  if (pairs.length === 0) {
    return {
      candidates: [],
      meta: {
        engine: 'modular',
        reason: '호환되는 구조-기술 조합이 없습니다.',
        structureCount: structures.length,
        skillCount: skills.length,
        topFailureReasons: [],
      },
    }
  }

  // Build candidates from pairs
  const maxModifierCount = gradeConfig.maxModifierCount
  const candidates = []
  const seen = new Set()
  const failureReasonCounts = {}
  const maxAttempts = Math.max(1, pairs.length * 4)
  let attempts = 0

  // Build a coreRule-compatible object for validateCandidate
  const coreRule = {
    coreRules: sportData.coreRules,
    requiredConcepts: sportData.requiredConcepts,
    forbiddenModifierIds: sportData.forbiddenModifierIds,
    forbiddenTags: sportData.forbiddenTags,
    safetyRules: sportData.safetyRules,
    defaultEquipment: sportData.defaultEquipment,
  }

  // Shuffle pairs for randomness
  const shuffledPairs = shuffle(pairs)
  const usedStructureIds = new Set()

  for (const pair of shuffledPairs) {
    if (candidates.length >= maxCandidates) break
    if (attempts >= maxAttempts) break
    attempts += 1

    // Prefer unique structures when possible
    if (
      usedStructureIds.has(pair.structure.id) &&
      shuffledPairs.length >= maxCandidates &&
      candidates.length < Math.max(1, maxCandidates - 1)
    ) {
      continue
    }

    const selectedModifiers = pickModifiers(modifiers, maxModifierCount)

    const uniqueKey = `${pair.structure.id}:${pair.skill.id}:${selectedModifiers.map((m) => m.id).sort().join('|')}`
    if (seen.has(uniqueKey)) continue
    seen.add(uniqueKey)

    const candidate = compileActivity(pair.structure, pair.skill, selectedModifiers, sportData)

    // Map request for validation (space → location)
    const validationRequest = {
      ...request,
      location: request.space,
    }

    const validation = validateCandidate({ candidate, request: validationRequest, coreRule })

    if (!validation.valid) {
      validation.reasons.forEach((reason) => {
        failureReasonCounts[reason] = (failureReasonCounts[reason] || 0) + 1
      })
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

    usedStructureIds.add(pair.structure.id)
  }

  // Sort by score and take top 3
  const topCandidates = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates)
    .map((candidate, index) => {
      const rendered = renderTemplate(candidate, index + 1)
      if (!rendered) return candidate
      return {
        ...candidate,
        titleWithOrder: rendered.titleWithOrder,
        templateText: rendered.templateText,
      }
    })

  const topFailureReasons = Object.entries(failureReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => ({ reason, count }))

  return {
    candidates: topCandidates,
    meta: {
      engine: 'modular',
      attempts,
      pairCount: pairs.length,
      structureCount: structures.length,
      skillCount: candidateSkills.length,
      modifierCount: modifiers.length,
      requestedSportSkillCount: requestedSportSkills.length,
      matchedSportSkillCount: matchedSkills.length,
      topFailureReasons,
      reason: topCandidates.length === 0
        ? topFailureReasons[0]?.reason || '조건에 맞는 후보를 생성하지 못했습니다.'
        : undefined,
    },
  }
}
