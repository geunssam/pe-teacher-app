/**
 * Genkit 클라이언트 서비스
 *
 * 개발: Vite 프록시 /genkit -> localhost:3400
 * 프로덕션: 환경변수 VITE_GENKIT_URL 또는 Cloud Run 엔드포인트
 */

const GENKIT_BASE_URL = import.meta.env.VITE_GENKIT_URL || '';

/** Genkit 서버 헬스 체크 (VITE_GENKIT_URL 미설정 시 스킵) */
export async function checkGenkitHealth() {
  if (!GENKIT_BASE_URL) return false;
  try {
    // startFlowServer는 /api/health를 제공하지 않으므로
    // chatFlow에 빈 OPTIONS 요청으로 서버 존재 여부 확인
    const res = await fetch(`${GENKIT_BASE_URL}/chatFlow`, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(3000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

/** AI 수업 추천 요청 */
export async function requestRecommendation({ query, filters, recentActivities }) {
  if (!GENKIT_BASE_URL) throw new Error('Genkit 서버가 설정되지 않았습니다 (VITE_GENKIT_URL)');
  const res = await fetch(`${GENKIT_BASE_URL}/recommendFlow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { query, filters, recentActivities } }),
  });
  if (!res.ok) throw new Error(`Genkit error: ${res.status}`);
  const json = await res.json();
  return json.result;
}

/** 채팅 메시지 전송 */
export async function sendChatMessage({ message, history }) {
  if (!GENKIT_BASE_URL) throw new Error('Genkit 서버가 설정되지 않았습니다 (VITE_GENKIT_URL)');
  const res = await fetch(`${GENKIT_BASE_URL}/chatFlow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { message, history } }),
  });
  if (!res.ok) throw new Error(`Genkit error: ${res.status}`);
  const json = await res.json();
  return json.result;
}

/** 수업 기록 동기화 (RAG 인덱싱) */
export async function syncRecords(records) {
  if (!GENKIT_BASE_URL) throw new Error('Genkit 서버가 설정되지 않았습니다 (VITE_GENKIT_URL)');
  const res = await fetch(`${GENKIT_BASE_URL}/syncRecordsFlow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { records } }),
  });
  if (!res.ok) throw new Error(`Genkit error: ${res.status}`);
  const json = await res.json();
  return json.result;
}
