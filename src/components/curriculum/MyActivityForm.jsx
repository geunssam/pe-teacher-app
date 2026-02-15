// 내 활동 추가 폼 — 간편 입력 (3필드 기본 + 아코디언) + ACE 자동생성 | Wave 2 기본 → Wave 3에서 확장 예정
import { useState } from 'react'
import GlassCard from '../common/GlassCard'
import { generateAceLesson } from '../../utils/curriculum/aceAutoGen'

const SPACE_OPTIONS = ['교실', '체육관', '운동장', '강당', '다목적실']
const DIFFICULTY_OPTIONS = [
  { value: 1, label: '쉬움', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { value: 2, label: '보통', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { value: 3, label: '어려움', color: 'bg-red-50 text-red-600 border-red-200' },
]
const ACE_OPTIONS = [
  { value: 'A', label: 'A 활동' },
  { value: 'C', label: 'C 경쟁' },
  { value: 'E', label: 'E 평가' },
]

export default function MyActivityForm({ onSave, onCancel }) {
  // 기본 필드
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])

  // 아코디언 (더 자세히)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [space, setSpace] = useState([])
  const [equipment, setEquipment] = useState('')
  const [difficulty, setDifficulty] = useState(2)
  const [acePhase, setAcePhase] = useState('')
  const [fmsSkills, setFmsSkills] = useState('')

  // ACE 수업안 생성 상태
  const [generatedLesson, setGeneratedLesson] = useState(null)

  const canSave = name.trim().length > 0

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const toggleSpace = (s) => {
    setSpace((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  const handleGenerateAce = () => {
    const activity = buildActivityFromForm()
    const lesson = generateAceLesson(activity)
    setGeneratedLesson(lesson)
  }

  const buildActivityFromForm = () => ({
    name: name.trim(),
    description: description.trim(),
    source: source.trim(),
    tags,
    space: space.length > 0 ? space : ['체육관'],
    equipment: equipment.trim() ? equipment.split(',').map((e) => e.trim()).filter(Boolean) : [],
    difficulty,
    acePhase: acePhase || undefined,
    fmsSkills: fmsSkills.trim() ? fmsSkills.split(',').map((s) => s.trim()).filter(Boolean) : [],
    fmsCategories: [],
  })

  const handleSave = () => {
    if (!canSave) return
    const activity = buildActivityFromForm()
    if (generatedLesson) {
      activity.aceLesson = generatedLesson
    }
    onSave(activity)
  }

  return (
    <div className="space-y-4">
      {/* 기본 입력 */}
      <GlassCard className="p-5">
        <div className="space-y-3">
          {/* 활동명 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              활동명 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 릴레이 달리기"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#7C9EF5] focus:ring-1 focus:ring-[#7C9EF5]/30 outline-none transition-colors bg-white/80"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="활동 내용을 간단히 설명해주세요"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#7C9EF5] focus:ring-1 focus:ring-[#7C9EF5]/30 outline-none transition-colors bg-white/80 resize-none"
            />
          </div>

          {/* 출처/메모 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">출처 / 메모</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="예: 교사연수 자료, 유튜브 영상 등"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#7C9EF5] focus:ring-1 focus:ring-[#7C9EF5]/30 outline-none transition-colors bg-white/80"
            />
          </div>

          {/* 태그 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">태그</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="태그 입력 후 Enter"
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#7C9EF5] focus:ring-1 focus:ring-[#7C9EF5]/30 outline-none transition-colors bg-white/80"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="shrink-0 px-3 py-2 text-xs font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                추가
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] bg-[#7C9EF5]/10 text-[#7C9EF5] rounded-full px-2.5 py-0.5"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* 더 자세히 (아코디언) */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors px-1"
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        더 자세히
      </button>

      {showAdvanced && (
        <GlassCard className="p-5">
          <div className="space-y-3">
            {/* 장소 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">장소</label>
              <div className="flex flex-wrap gap-1.5">
                {SPACE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpace(s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                      space.includes(s)
                        ? 'bg-[#7C9EF5] text-white border-[#7C9EF5]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#7C9EF5]/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 준비물 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">준비물</label>
              <input
                type="text"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="쉼표로 구분 (예: 콘, 줄넘기, 공)"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#7C9EF5] focus:ring-1 focus:ring-[#7C9EF5]/30 outline-none transition-colors bg-white/80"
              />
            </div>

            {/* 난이도 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">난이도</label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDifficulty(opt.value)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      difficulty === opt.value ? opt.color : 'bg-white text-gray-400 border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ACE 단계 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">ACE 단계</label>
              <div className="flex gap-2">
                {ACE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAcePhase(acePhase === opt.value ? '' : opt.value)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      acePhase === opt.value
                        ? 'bg-[#7C9EF5] text-white border-[#7C9EF5]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#7C9EF5]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FMS 기술 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">FMS 기술</label>
              <input
                type="text"
                value={fmsSkills}
                onChange={(e) => setFmsSkills(e.target.value)}
                placeholder="쉼표로 구분 (예: 달리기, 던지기)"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#7C9EF5] focus:ring-1 focus:ring-[#7C9EF5]/30 outline-none transition-colors bg-white/80"
              />
            </div>
          </div>
        </GlassCard>
      )}

      {/* ACE 수업안 자동생성 */}
      {generatedLesson && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-emerald-600">ACE 수업안 생성 완료</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5">
              {generatedLesson._templateLabel}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            도입 {generatedLesson.intro.minutes}분 → A {generatedLesson.acquire.minutes}분 → C {generatedLesson.challenge.minutes}분 → E {generatedLesson.engage.minutes}분 → 마무리 {generatedLesson.wrapup.minutes}분
          </p>
        </GlassCard>
      )}

      {/* 하단 버튼 */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleGenerateAce}
          disabled={!canSave}
          className="py-2.5 px-4 rounded-xl text-sm font-medium text-[#F5A67C] bg-[#F5A67C]/10 hover:bg-[#F5A67C]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ACE 초안
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#7C9EF5] hover:bg-[#6b8de4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          저장
        </button>
      </div>
    </div>
  )
}
