// 수업 아웃라인 빌더 — 5부분(도입-활동1-활동2-활동3-정리) 구조 생성 + locked/flexible 구분 + gradeLevelHint 활용 | 호출→SketchPage.jsx

const MODIFIER_COACH_GUIDE = {
  round_ladder: [
    '라운드1→2→3 순서로 성공 기준을 단계별로 올린다. 예: 3회→5회→7회.',
    '운영 팁: 라운드 시작 전에 이번 라운드 목표 숫자를 칠판/보드에 크게 표시한다.',
  ],
  score_target_zone_bonus: [
    '타깃존(콘 4개, 약 1.5m x 1.5m) 안에서 마무리되면 기존 점수에 +1을 추가한다.',
    '판정 기준: 라운드당 보너스는 공격 1회당 최대 1점, 중복 보너스는 불가.',
  ],
}

export function buildModifierGuideLines(candidate) {
  const modifierNarratives = candidate?.modifierNarratives?.length
    ? candidate.modifierNarratives
    : (candidate?.modifiers || []).map((modifier) => ({
      id: modifier.id,
      name: modifier.name,
      type: modifier.type,
      ruleText: modifier.ruleText || modifier.ruleOverride || '',
      equipmentNeeded: modifier.equipmentNeeded || [],
    }))

  const detailLines = candidate?.modifierDetails?.length
    ? candidate.modifierDetails
    : modifierNarratives.map(
      (modifier) => `적용 변형: ${modifier.name} (${modifier.type}) - ${modifier.ruleText}`
    )

  return modifierNarratives.flatMap((modifier, index) => {
    const detail = detailLines[index] || `적용 변형: ${modifier.name} (${modifier.type}) - ${modifier.ruleText}`
    const guide = MODIFIER_COACH_GUIDE[modifier.id] || []
    const equipment = modifier.equipmentNeeded?.length
      ? [`준비물 추가: ${modifier.equipmentNeeded.join(', ')}`]
      : []

    // New CSV modifier fields
    const csvFields = []
    const src = candidate?.modifiers?.[index] || {}
    if (src.teacherMeaning) csvFields.push(`의도: ${src.teacherMeaning}`)
    if (src.setupExample) csvFields.push(`셋업: ${src.setupExample}`)
    if (src.scoringExample) csvFields.push(`점수: ${src.scoringExample}`)

    return [detail, ...guide, ...csvFields, ...equipment]
  })
}

/**
 * buildLessonOutline — 모든 모드 통합 수업 아웃라인 생성
 * locked/flexible 구분 + gradeLevelHint 학년별 코칭 큐 자동 삽입
 */
export function buildLessonOutline({ candidate, durationMin, fmsFocus, sportSkills, grade }) {
  const introMin = Math.max(6, Math.round(durationMin * 0.2))
  const closingMin = Math.max(6, Math.round(durationMin * 0.15))
  const developTotal = Math.max(15, durationMin - introMin - closingMin)
  const basePart = Math.max(5, Math.floor(developTotal / 3))
  const remainder = developTotal - basePart * 3
  const developDurations = [basePart, basePart, basePart + remainder]

  const gradeHint = (grade && candidate.gradeLevelHint?.[grade]) || null
  const focusCues = gradeHint?.focusCues || []
  const teachingCues = candidate.teachingCues || []
  const commonErrors = candidate.commonErrors || []
  const quickFixes = candidate.quickFixes || []
  const challengeRules = candidate.challengeRules || []
  const closureGameRules = candidate.closureGameRules || []
  const safetyRules = candidate.safetyRules || []

  const modifiers = (candidate.modifiers || [])
    .map((modifier) => {
      const ruleText = modifier.ruleText || modifier.ruleOverride
      return ruleText ? `${modifier.type}: ${ruleText}` : null
    })
    .filter(Boolean)

  const compiledFlow = candidate.compiledFlow?.length ? candidate.compiledFlow : []
  const modifierGuide = buildModifierGuideLines(candidate)
  const modifierNarratives = candidate.modifierNarratives || candidate.modifiers || []
  const modifierNames = candidate.titleModifierNames?.length
    ? candidate.titleModifierNames
    : modifierNarratives.map((m) => m.name).filter(Boolean)

  const focusSkill = sportSkills?.[0] || candidate.skillName || '기본기'
  const focusFms = fmsFocus?.[0] || '기본 움직임'

  // Editable fields info
  const editableFields = candidate.editableFields || null
  const lockedFields = new Set(editableFields?.locked || [])

  // Helper to tag bullet as locked or flexible
  const tagBullet = (text, fieldHint) => ({
    text,
    editable: fieldHint ? !lockedFields.has(fieldHint) : true,
  })

  // Build intro bullets
  const introBullets = [
    tagBullet(`${candidate.sport} 수업 안전 규칙 및 역할을 2분 내 안내한다.`, 'safetyRules'),
    tagBullet(`FMS 포커스(${(fmsFocus || []).join(', ') || '기본 움직임'}) 중심 준비 활동으로 신체를 활성화한다.`),
    tagBullet(`종목기술(${(sportSkills || []).join(', ') || '기본기'})의 오늘 목표를 명확히 제시한다.`, '기술동작'),
  ]

  if (focusCues.length > 0) {
    introBullets.push(tagBullet(`학년 코칭 큐: ${focusCues[0]}`, '기술동작'))
  }

  if (safetyRules.length > 0) {
    introBullets.push(tagBullet(`안전 약속: ${safetyRules[0]}${safetyRules[1] ? ` / ${safetyRules[1]}` : ''}`, 'safetyRules'))
  }

  if (modifierNames.length > 0) {
    introBullets.push(tagBullet(`오늘 변형 적용: ${modifierNames.join(', ')}`))
  }

  // Build develop sections
  const activity1Bullets = [
    ...(compiledFlow.slice(0, 2).map((flow) => tagBullet(flow, '기술동작'))),
    ...(teachingCues.slice(0, 2).map((cue) => tagBullet(`코칭 큐: ${cue}`, '기술동작'))),
    ...(focusCues.slice(0, 1).map((cue) => tagBullet(`학년별 핵심: ${cue}`, '기술동작'))),
    ...(quickFixes.slice(0, 1).map((fix) => tagBullet(`즉시 교정: ${fix}`))),
  ]
  if (activity1Bullets.length === 0) {
    activity1Bullets.push(...candidate.basicRules.slice(0, 3).map((rule) => tagBullet(rule, '기술동작')))
  }

  const activity2Bullets = [
    ...(candidate.penaltiesMissions.slice(0, 2).map((rule) => tagBullet(rule))),
    ...(candidate.operationTips.slice(0, 1).map((tip) => tagBullet(tip))),
    ...(modifierGuide.slice(0, 2).map((line) => tagBullet(line))),
    ...(challengeRules.slice(0, 1).map((rule) => tagBullet(rule))),
  ]

  const activity3Bullets = [
    ...(modifiers.length > 0 ? modifiers.slice(0, 2).map((m) => tagBullet(m)) : candidate.operationTips.slice(0, 2).map((tip) => tagBullet(tip))),
    ...(closureGameRules.slice(0, 2).map((rule) => tagBullet(rule))),
    ...(candidate.educationEffects.slice(0, 1).map((effect) => tagBullet(effect))),
  ]

  // Closing
  const closingBullets = [
    tagBullet(`핵심 회고: ${teachingCues[0] || '오늘 가장 잘 된 전략'}을 팀별로 공유한다.`),
    tagBullet(`자가평가: ${focusFms} + ${focusSkill}를 1~3단계(기초/안정/게임적용)로 체크한다.`),
    tagBullet(
      commonErrors.length > 0
        ? `다음 차시 과제: ${commonErrors[0]}를 줄이는 개인 목표 1개 기록.`
        : '다음 차시 과제 1개 기록 후 장비 정리와 정렬로 마무리한다.'
    ),
  ]

  if (gradeHint?.maxDistance) {
    closingBullets.push(tagBullet(`참고: 이 학년 권장 최대 거리 ${gradeHint.maxDistance}`))
  }

  return {
    intro: {
      title: '도입',
      durationMin: introMin,
      bullets: introBullets.map((b) => b.text),
      bulletMeta: introBullets.map((b) => ({ editable: b.editable })),
    },
    develop: [
      {
        title: '활동 1. 기본 구조 익히기',
        subtitle: candidate.title,
        durationMin: developDurations[0],
        bullets: activity1Bullets.map((b) => b.text),
        bulletMeta: activity1Bullets.map((b) => ({ editable: b.editable })),
      },
      {
        title: '활동 2. 규칙 적용 게임',
        subtitle: '미션과 역할 전환 적용',
        durationMin: developDurations[1],
        bullets: activity2Bullets.map((b) => b.text),
        bulletMeta: activity2Bullets.map((b) => ({ editable: b.editable })),
      },
      {
        title: '활동 3. 전략 변형 라운드',
        subtitle: '부수 규칙 조합 활용',
        durationMin: developDurations[2],
        bullets: activity3Bullets.map((b) => b.text),
        bulletMeta: activity3Bullets.map((b) => ({ editable: b.editable })),
      },
    ],
    closing: {
      title: '정리',
      durationMin: closingMin,
      bullets: closingBullets.map((b) => b.text),
      bulletMeta: closingBullets.map((b) => ({ editable: b.editable })),
    },
    modifierGuide,
    gradeHint,
    editableFields,
  }
}

export function cloneLessonOutline(outline) {
  if (!outline) {
    return null
  }

  return {
    intro: {
      ...outline.intro,
      bullets: [...(outline.intro?.bullets || [])],
      bulletMeta: [...(outline.intro?.bulletMeta || [])],
    },
    develop: (outline.develop || []).map((activity) => ({
      ...activity,
      bullets: [...(activity.bullets || [])],
      bulletMeta: [...(activity.bulletMeta || [])],
    })),
    closing: {
      ...outline.closing,
      bullets: [...(outline.closing?.bullets || [])],
      bulletMeta: [...(outline.closing?.bulletMeta || [])],
    },
    modifierGuide: [...(outline.modifierGuide || [])],
    gradeHint: outline.gradeHint || null,
    editableFields: outline.editableFields || null,
  }
}
