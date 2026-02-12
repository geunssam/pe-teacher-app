function hasItems(list) {
  return Array.isArray(list) && list.length > 0
}

function renderSection(title, items) {
  return `${title}\n${items.map((item) => `- ${item}`).join('\n')}`
}

export function renderTemplate(candidate, order = 1) {
  if (!candidate || !candidate.title) {
    return null
  }

  const required = [
    candidate.basicRules,
    candidate.penaltiesMissions,
    candidate.operationTips,
    candidate.educationEffects,
    candidate.equipment,
  ]

  if (required.some((section) => !hasItems(section))) {
    return null
  }

  const youtubeLine = candidate.youtubeUrl
    ? `- ${candidate.youtubeUrl}`
    : '- 유튜브 링크 없음'

  const templateText = [
    `#${order}. ${candidate.title}`,
    renderSection('기본 규칙', candidate.basicRules),
    renderSection('벌칙/미션', candidate.penaltiesMissions),
    renderSection('운영 팁/변형', candidate.operationTips),
    renderSection('교육적 효과', candidate.educationEffects),
    `유튜브 링크\n${youtubeLine}`,
    renderSection('교구/준비물', candidate.equipment),
  ].join('\n\n')

  return {
    titleWithOrder: `#${order}. ${candidate.title}`,
    templateText,
  }
}
