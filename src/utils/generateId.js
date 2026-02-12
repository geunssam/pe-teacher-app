/**
 * 고유 ID 생성 유틸리티
 */

/**
 * 타임스탬프 기반 고유 ID 생성
 * @returns {string} 고유 ID (예: "cls_1707123456789_r4k2")
 */
export function generateId(prefix = 'id') {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 6)
  return `${prefix}_${timestamp}_${random}`
}

/**
 * 학급 ID 생성
 */
export function generateClassId() {
  return generateId('cls')
}

/**
 * 학생 ID 생성
 */
export function generateStudentId() {
  return generateId('std')
}

/**
 * 수업 기록 ID 생성
 */
export function generateRecordId() {
  return generateId('rec')
}
