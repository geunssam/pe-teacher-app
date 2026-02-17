// AI 상태관리 훅 — loading/error/generate/chat 통합 관리 | 서비스→services/ai.js, 프롬프트→services/aiPrompts.js
import { useState, useCallback, useRef, useEffect } from 'react'
import { generatePEContent, streamPEContent, createChatSession, isAIAvailable } from '../services/ai'
import { buildChatSystemPrompt } from '../services/aiPrompts'

const COOLDOWN_MS = 3000

/**
 * AI 단발성 생성 훅
 * @returns {{ loading, error, result, generate, generateStream, reset }}
 */
export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [streamingText, setStreamingText] = useState('')
  const lastCallRef = useRef(0)

  const checkAvailability = useCallback(() => {
    if (!isAIAvailable()) {
      setError('인터넷 연결이 필요합니다')
      return false
    }
    const now = Date.now()
    if (now - lastCallRef.current < COOLDOWN_MS) {
      setError('잠시 후 다시 시도해주세요')
      return false
    }
    return true
  }, [])

  const generate = useCallback(async (prompt) => {
    if (!checkAvailability()) return null

    setLoading(true)
    setError(null)
    setResult(null)
    lastCallRef.current = Date.now()

    try {
      const text = await generatePEContent(prompt)
      setResult(text)
      return text
    } catch (err) {
      const message = err?.message?.includes('429')
        ? 'AI 사용 한도에 도달했습니다. 잠시 후 다시 시도해주세요.'
        : err?.message?.includes('PERMISSION_DENIED')
          ? 'Firebase AI가 아직 활성화되지 않았습니다. Firebase Console에서 Gemini API를 활성화해주세요.'
          : `AI 생성 중 오류: ${err.message}`
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [checkAvailability])

  const generateStream = useCallback(async (prompt, onChunk) => {
    if (!checkAvailability()) return null

    setLoading(true)
    setError(null)
    setResult(null)
    setStreamingText('')
    lastCallRef.current = Date.now()

    try {
      const text = await streamPEContent(prompt, (chunk) => {
        setStreamingText((prev) => prev + chunk)
        onChunk?.(chunk)
      })
      setResult(text)
      return text
    } catch (err) {
      const message = err?.message?.includes('429')
        ? 'AI 사용 한도에 도달했습니다. 잠시 후 다시 시도해주세요.'
        : `AI 생성 중 오류: ${err.message}`
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [checkAvailability])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setResult(null)
    setStreamingText('')
  }, [])

  return { loading, error, result, streamingText, generate, generateStream, reset }
}

/**
 * AI 채팅 훅
 * @returns {{ messages, loading, error, sendMessage, clearChat }}
 */
export function useAIChat() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const chatRef = useRef(null)
  const lastCallRef = useRef(0)
  const genkitAvailableRef = useRef(false)

  // Check Genkit availability on mount
  useEffect(() => {
    import('../services/genkit').then(({ checkGenkitHealth }) => {
      checkGenkitHealth().then((ok) => { genkitAvailableRef.current = ok })
    }).catch(() => {})
  }, [])

  const ensureChat = useCallback(() => {
    if (!chatRef.current) {
      chatRef.current = createChatSession(buildChatSystemPrompt())
    }
    return chatRef.current
  }, [])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return
    if (!isAIAvailable()) {
      setError('인터넷 연결이 필요합니다')
      return
    }

    const now = Date.now()
    if (now - lastCallRef.current < COOLDOWN_MS) {
      setError('잠시 후 다시 시도해주세요')
      return
    }

    const userTs = Date.now()
    const userMsg = { role: 'user', text: text.trim(), ts: userTs }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    setError(null)
    lastCallRef.current = now

    // AI 응답 플레이스홀더 추가 (유저 메시지와 키 충돌 방지)
    const aiMsgId = userTs + 1
    setMessages((prev) => [...prev, { role: 'model', text: '', ts: aiMsgId, streaming: true }])

    try {
      if (genkitAvailableRef.current) {
        // Try Genkit RAG path first — richer context from vectorstore
        try {
          const { sendChatMessage } = await import('../services/genkit')
          const history = messages
            .filter((m) => !m.streaming)
            .map((m) => ({ role: m.role, content: m.text }))
          const response = await sendChatMessage({ message: text.trim(), history })

          setMessages((prev) =>
            prev.map((msg) =>
              msg.ts === aiMsgId ? { ...msg, text: response, streaming: false } : msg
            )
          )
          return // success via Genkit
        } catch (genkitErr) {
          console.warn('[useAIChat] Genkit failed, falling back to Firebase AI:', genkitErr.message)
          // Fall through to Firebase AI
        }
      }

      // Firebase AI Logic path (기본 경로)
      const chat = ensureChat()
      await chat.sendMessageStream(text.trim(), (chunk) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.ts === aiMsgId ? { ...msg, text: msg.text + chunk } : msg
          )
        )
      })

      // 스트리밍 완료 표시
      setMessages((prev) =>
        prev.map((msg) =>
          msg.ts === aiMsgId ? { ...msg, streaming: false } : msg
        )
      )
    } catch (err) {
      const message = err?.message?.includes('429')
        ? 'AI 사용 한도에 도달했습니다.'
        : `오류: ${err.message}`
      setError(message)
      // 실패한 AI 메시지 제거
      setMessages((prev) => prev.filter((msg) => msg.ts !== aiMsgId))
    } finally {
      setLoading(false)
    }
  }, [ensureChat, messages])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
    chatRef.current = null
  }, [])

  return { messages, loading, error, sendMessage, clearChat }
}
