// AI 수업 추천 오케스트레이터 훅 — Genkit RAG 추천 + 규칙 기반 fallback | 서비스→services/genkit.js
import { useState, useCallback, useEffect, useRef } from 'react'
import { checkGenkitHealth, requestRecommendation } from '../services/genkit'

const COOLDOWN_MS = 3000

/**
 * AI 수업 추천 훅 (설계서 Section 7.2)
 *
 * - isGenkitAvailable: Genkit 서버 연결 상태
 * - aiRecommendations: AI 추천 결과 { recommendations, summary }
 * - isAiLoading: AI 추천 요청 중
 * - aiError: 에러 메시지
 * - requestAiRecommend(query, filters, recentActivities): 추천 요청
 * - clearAiRecommendations(): 결과 초기화
 *
 * fallback: Genkit 실패 시 기존 규칙 기반 결과 유지 (이 훅은 AI 경로만 담당)
 */
export function useRecommend() {
  const [aiRecommendations, setAiRecommendations] = useState(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [isGenkitAvailable, setIsGenkitAvailable] = useState(false)
  const lastCallRef = useRef(0)
  const healthCheckedRef = useRef(false)

  // Genkit 서버 health check (마운트 시 1회)
  useEffect(() => {
    if (healthCheckedRef.current) return
    healthCheckedRef.current = true

    checkGenkitHealth().then((ok) => {
      setIsGenkitAvailable(ok)
    })
  }, [])

  /**
   * AI 추천 요청
   * @param {string} query - 자연어 질문 또는 필터 요약 텍스트
   * @param {object} [filters] - { grade, space, sport, weather, studentCount, duration }
   * @param {string[]} [recentActivities] - 최근 사용한 활동명 배열
   * @returns {object|null} recommendations 결과 또는 null (실패 시)
   */
  const requestAiRecommend = useCallback(async (query, filters = {}, recentActivities = []) => {
    if (!isGenkitAvailable) {
      setAiError('AI 추천 서버가 연결되지 않았습니다.')
      return null
    }

    // Cooldown 체크
    const now = Date.now()
    if (now - lastCallRef.current < COOLDOWN_MS) {
      setAiError('잠시 후 다시 시도해주세요.')
      return null
    }

    setIsAiLoading(true)
    setAiError(null)
    lastCallRef.current = now

    try {
      const result = await requestRecommendation({
        query,
        filters,
        recentActivities,
      })
      setAiRecommendations(result)
      return result
    } catch (err) {
      const message = err?.message?.includes('429')
        ? 'AI 사용 한도에 도달했습니다. 잠시 후 다시 시도해주세요.'
        : err?.message?.includes('PERMISSION_DENIED')
          ? 'AI 서비스가 활성화되지 않았습니다.'
          : `AI 추천 오류: ${err.message}`
      setAiError(message)
      console.warn('[useRecommend] AI recommend failed:', err.message)
      return null
    } finally {
      setIsAiLoading(false)
    }
  }, [isGenkitAvailable])

  /** 추천 결과 초기화 */
  const clearAiRecommendations = useCallback(() => {
    setAiRecommendations(null)
    setAiError(null)
  }, [])

  /** Genkit 서버 상태 수동 재확인 */
  const recheckHealth = useCallback(async () => {
    const ok = await checkGenkitHealth()
    setIsGenkitAvailable(ok)
    return ok
  }, [])

  return {
    // 상태
    aiRecommendations,
    isAiLoading,
    aiError,
    isGenkitAvailable,
    // 액션
    requestAiRecommend,
    clearAiRecommendations,
    recheckHealth,
  }
}
