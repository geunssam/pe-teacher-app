// 벌칙 타입 정규화 유틸 — 3개 엔진(activityEngine, moduleCompiler, generateCandidates)에서 공통 사용
const PENALTY_TYPES = new Set(['벌칙조건', '벌칙/미션', 'penalty', '벌칙'])

export function isPenaltyType(type) {
  return PENALTY_TYPES.has(type)
}
