// 마크다운 서식 제거 유틸 — AI 응답의 **bold**, *italic*, ## heading 등을 플레인 텍스트로 변환

/**
 * 마크다운 서식 문자를 제거하고 순수 텍스트만 반환
 * @param {string} text - 마크다운 서식이 포함된 텍스트
 * @returns {string} 서식이 제거된 플레인 텍스트
 */
export function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return text ?? ''

  return text
    // 볼드+이탈릭: ***text*** or ___text___
    .replace(/(\*{3}|_{3})(.+?)\1/g, '$2')
    // 볼드: **text** or __text__
    .replace(/(\*{2}|_{2})(.+?)\1/g, '$2')
    // 이탈릭: *text* or _text_ (단어 경계 보호)
    .replace(/(?<!\w)(\*|_)(?!\s)(.+?)(?<!\s)\1(?!\w)/g, '$2')
    // 취소선: ~~text~~
    .replace(/~~(.+?)~~/g, '$1')
    // 인라인 코드: `code`
    .replace(/`([^`]+)`/g, '$1')
    // 헤딩: ## Heading → Heading
    .replace(/^#{1,6}\s+/gm, '')
    // 잔여 ** 정리
    .replace(/\*{2,}/g, '')
    // 리스트 마커 유지 (- 또는 * 으로 시작하는 줄은 유지)
}
