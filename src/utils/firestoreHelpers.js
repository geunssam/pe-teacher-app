// Firestore 데이터 정제 헬퍼 — undefined 제거 + 대용량 필드 트리밍 | 사용처→useClassManager, useRecordManager

/** Firestore 비호환 데이터 정제 (undefined → null, 순환 참조 제거) */
export function sanitizeForFirestore(obj) {
  return JSON.parse(JSON.stringify(obj, (_key, value) =>
    value === undefined ? null : value
  ))
}

/** aceLesson 등 큰 객체 크기 제한 (직렬화 후 10KB 초과 시 주요 필드만) */
export function trimLargeFields(record) {
  if (!record.aceLesson) return record
  const serialized = JSON.stringify(record.aceLesson)
  if (serialized.length <= 10_000) return record
  const { title, domain, sport, grade, activities, structure } = record.aceLesson
  return { ...record, aceLesson: { title, domain, sport, grade, activities, structure } }
}
