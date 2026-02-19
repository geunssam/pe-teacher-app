// Firebase AI Logic 서비스 — Gemini 모델 초기화 + 텍스트 생성/스트리밍/채팅 | 사용처→hooks/useAI.js
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'
import app from './firebase'

// Firebase AI Logic 초기화 (firebaseConfig.apiKey 사용, 별도 키 불필요)
const ai = getAI(app, { backend: new GoogleAIBackend() })

// Gemini 2.5 Flash 모델 (무료 Spark Plan: 분당 10회, 일 250회)
const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' })

// --- 응답 캐싱 (sessionStorage, 5분 TTL) ---
const CACHE_TTL = 5 * 60 * 1000

function getCached(key) {
  try {
    const raw = sessionStorage.getItem(`ai_cache_${key}`)
    if (!raw) return null
    const { text, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(`ai_cache_${key}`)
      return null
    }
    return text
  } catch {
    return null
  }
}

function setCache(key, text) {
  try {
    sessionStorage.setItem(`ai_cache_${key}`, JSON.stringify({ text, ts: Date.now() }))
  } catch {
    // sessionStorage full — ignore
  }
}

function hashPrompt(prompt) {
  let hash = 0
  for (let i = 0; i < prompt.length; i++) {
    hash = ((hash << 5) - hash + prompt.charCodeAt(i)) | 0
  }
  return String(hash)
}

/**
 * 단발성 텍스트 생성 (캐싱 포함)
 * @param {string} prompt - 프롬프트 텍스트
 * @returns {Promise<string>} 생성된 텍스트
 */
export async function generatePEContent(prompt) {
  const cacheKey = hashPrompt(prompt)
  const cached = getCached(cacheKey)
  if (cached) return cached

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  setCache(cacheKey, text)
  return text
}

/**
 * 스트리밍 텍스트 생성
 * @param {string} prompt - 프롬프트 텍스트
 * @param {function} onChunk - 청크 콜백 (chunkText) => void
 * @returns {Promise<string>} 전체 텍스트
 */
export async function streamPEContent(prompt, onChunk) {
  const result = await model.generateContentStream(prompt)
  let fullText = ''

  for await (const chunk of result.stream) {
    const chunkText = chunk.text()
    fullText += chunkText
    onChunk?.(chunkText)
  }

  const cacheKey = hashPrompt(prompt)
  setCache(cacheKey, fullText)
  return fullText
}

/**
 * 채팅 세션 생성 (멀티턴 대화)
 * @param {string} systemPrompt - 시스템 프롬프트
 * @param {Array} conversationHistory - 기존 대화 히스토리 [{ role, parts }] (세션 재생성 시 대화 유지용)
 * @returns {{ sendMessage, sendMessageStream }} 채팅 메서드
 */
export function createChatSession(systemPrompt, conversationHistory = []) {
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: '네, 알겠습니다. 체육 수업 전문 AI 어시스턴트로서 도움을 드리겠습니다.' }],
      },
      ...conversationHistory,
    ],
  })

  return {
    /**
     * 메시지 전송 (비스트리밍)
     * @param {string} message
     * @returns {Promise<string>}
     */
    async sendMessage(message) {
      const result = await chat.sendMessage(message)
      return result.response.text()
    },

    /**
     * 메시지 전송 (스트리밍)
     * @param {string} message
     * @param {function} onChunk - 청크 콜백
     * @returns {Promise<string>}
     */
    async sendMessageStream(message, onChunk) {
      const result = await chat.sendMessageStream(message)
      let fullText = ''

      for await (const chunk of result.stream) {
        const chunkText = chunk.text()
        fullText += chunkText
        onChunk?.(chunkText)
      }

      return fullText
    },
  }
}

/**
 * 온라인 상태 확인
 * @returns {boolean}
 */
export function isAIAvailable() {
  return navigator.onLine
}
