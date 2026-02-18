// 글로벌 AI 채팅 — 우하단 플로팅 버튼 + 슬라이드업 채팅 패널 | 훅→hooks/useAI.js, 스타일→css/components/ai.css
import { useState, useRef, useEffect } from 'react'
import { useAIChat } from '../../hooks/useAI'
import { isAIAvailable } from '../../services/ai'
import { checkGenkitHealth } from '../../services/genkit'
import { stripMarkdown } from '../../utils/stripMarkdown'

export default function AIChatPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, loading, error, sendMessage, clearChat, lessonContext, setLessonContext, clearLessonContext } = useAIChat()
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const [genkitReady, setGenkitReady] = useState(false)
  const [contextLabel, setContextLabel] = useState('')

  // Check Genkit availability on mount
  useEffect(() => {
    checkGenkitHealth().then(setGenkitReady)
  }, [])

  // 차시카드 AI 버튼 이벤트 리스닝
  useEffect(() => {
    const handler = (e) => {
      const { type, lessonContext: ctx, displayLabel } = e.detail || {}
      if (type === 'lesson-context' && ctx) {
        setLessonContext(ctx)
        setContextLabel(displayLabel || '')
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 300)
      }
    }
    window.addEventListener('pe-ai-chat-open', handler)
    return () => window.removeEventListener('pe-ai-chat-open', handler)
  }, [setLessonContext])

  // 새 메시지가 추가될 때 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 패널 열릴 때 입력 포커스
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  const handleSend = () => {
    if (!input.trim() || loading) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const available = isAIAvailable()

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={open ? 'ai-chat-fab ai-chat-fab--close' : 'ai-chat-fab ai-chat-fab--bot'}
        aria-label="AI 채팅"
        title={available ? 'AI 채팅' : '인터넷 연결이 필요합니다'}
        style={!available ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <img src="/ai-sparkle.png" alt="AI" className="ai-chat-fab-img" />
        )}
      </button>

      {/* 채팅 패널 */}
      {open && (
        <div className="ai-chat-panel">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">&#10024;</span>
              <h3 className="text-sm font-bold text-gray-800">체육 AI 도우미</h3>
              {genkitReady && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">RAG</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="text-[11px] px-2.5 py-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  초기화
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 컨텍스트 배너 */}
          {lessonContext && (
            <div className="flex items-center justify-between px-4 py-2 bg-purple-50 border-b border-purple-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs shrink-0">📎</span>
                <span className="text-[11px] text-purple-700 font-medium truncate">
                  {contextLabel || `${lessonContext.unitInfo?.grade} ${lessonContext.lessonInfo?.lesson}차시`}
                </span>
              </div>
              <button
                onClick={() => { clearLessonContext(); setContextLabel('') }}
                className="text-[10px] text-purple-400 hover:text-purple-600 shrink-0 ml-2"
              >
                해제
              </button>
            </div>
          )}

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[calc(70vh-130px)] scrollbar-hide">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">&#10024;</p>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {lessonContext ? `${contextLabel || '차시'} AI 도우미` : '체육 AI 도우미'}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {lessonContext
                    ? '이 차시에 대해 무엇이든 물어보세요'
                    : '체육 수업에 대해 무엇이든 물어보세요'}
                </p>
                <div className="mt-4 space-y-2">
                  {(lessonContext
                    ? [
                        '이 활동을 교실에서 할 수 있게 변형해줘',
                        '이 차시에 맞는 준비운동 추천해줘',
                        '비 올 때 대체 활동을 알려줘',
                      ]
                    : [
                        '3학년 실내 활동 추천해줘',
                        '피구 수업 ACE 흐름 알려줘',
                        '비 오는 날 체육 대체 활동은?',
                      ]
                  ).map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setInput(example)
                        setTimeout(() => inputRef.current?.focus(), 50)
                      }}
                      className="block w-full text-left px-3 py-2 rounded-xl text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.ts}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={msg.role === 'user' ? 'ai-chat-msg-user' : 'ai-chat-msg-model'}>
                  <span className="whitespace-pre-wrap">{msg.role === 'model' ? stripMarkdown(msg.text) : msg.text}</span>
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-3 ml-0.5 bg-[#A78BFA] rounded-sm animate-pulse" />
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="text-center">
                <p className="text-[11px] text-red-400">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={available ? '수업에 대해 물어보세요...' : '인터넷 연결 필요'}
                disabled={!available || loading}
                className="ai-chat-input flex-1"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading || !available}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #7C9EF5, #A78BFA)',
                  color: 'white',
                }}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
