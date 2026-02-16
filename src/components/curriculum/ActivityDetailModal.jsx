// 활동 상세 모달 — ACE 수업 흐름 편집 + 폴딩 + 아이디어 팁 | Modal→common/Modal.jsx
import { useState } from 'react'
import Modal from '../common/Modal'
import AceBadge from './AceBadge'
import IdeaTipPanel from './IdeaTipPanel'
import AceLessonFlow from './AceLessonFlow'
import { useEditedAceLesson } from '../../hooks/useEditedAceLesson'
import toast from 'react-hot-toast'

const DIFFICULTY_LABEL = { 1: '쉬움', 2: '보통', 3: '어려움' }
const DIFFICULTY_COLOR = {
  1: 'bg-emerald-50 text-emerald-600',
  2: 'bg-amber-50 text-amber-600',
  3: 'bg-red-50 text-red-600',
}

function SectionTitle({ children }) {
  return <h4 className="text-xs font-bold text-gray-700 mb-1.5 mt-4 first:mt-0">{children}</h4>
}

// 폴딩 가능한 섹션 (교사 팁 등)
function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors"
      >
        <span className={`text-[10px] transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        {title}
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  )
}

export default function ActivityDetailModal({ activity, onClose, relatedActivities, onActivitySwitch, onAssignToSchedule }) {
  if (!activity) return null

  const {
    name, source, acePhase, difficulty,
    fmsCategories, fmsSkills, fitnessComponents,
    flow, rules, equipment, teachingTips,
    space, groupSize, durationMin, aceLesson: originalAceLesson,
  } = activity

  const { getEditedAceLesson, saveEditedAceLesson, deleteEditedAceLesson, hasEditedVersion } = useEditedAceLesson()

  // 편집 모드 상태
  const [isEditingAce, setIsEditingAce] = useState(false)
  const edited = getEditedAceLesson(activity.id)
  const displayAceLesson = edited?.aceLesson || originalAceLesson
  const hasAceLesson = !!displayAceLesson
  const isEdited = hasEditedVersion(activity.id)

  // 편집 중 로컬 상태
  const [editingAceLesson, setEditingAceLesson] = useState(null)

  const handleStartEdit = () => {
    setEditingAceLesson(JSON.parse(JSON.stringify(displayAceLesson)))
    setIsEditingAce(true)
  }

  const handleSaveEdit = () => {
    if (!editingAceLesson) return
    saveEditedAceLesson(activity.id, activity.name, editingAceLesson)
    setIsEditingAce(false)
    setEditingAceLesson(null)
    toast.success('ACE 수업 흐름이 저장되었습니다')
  }

  const handleCancelEdit = () => {
    setIsEditingAce(false)
    setEditingAceLesson(null)
  }

  const handleRevert = () => {
    deleteEditedAceLesson(activity.id)
    setIsEditingAce(false)
    setEditingAceLesson(null)
    toast.success('원본으로 복원되었습니다')
  }

  // 현재 표시할 aceLesson (편집 중이면 editingAceLesson, 아니면 displayAceLesson)
  const activeAceLesson = isEditingAce ? editingAceLesson : displayAceLesson

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      {/* 스크롤 컨테이너 */}
      <div className="max-h-[80vh] overflow-y-auto -mx-6 px-6 -my-6 py-6">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="sticky top-0 float-right z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 활동명 + 출처 */}
        <h3 className="text-lg font-bold text-gray-900 pr-8 mb-1">{name}</h3>
        {source && <p className="text-[11px] text-gray-400 mb-3">{source}</p>}

        {/* 배지 행 */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <AceBadge phase={acePhase} />
          {isEdited && (
            <span className="text-[10px] bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 font-medium border border-blue-200">
              편집됨
            </span>
          )}
          {fmsCategories?.map((cat) => (
            <span key={cat} className="text-[11px] bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 font-medium">
              {cat}
            </span>
          ))}
          {difficulty && (
            <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${DIFFICULTY_COLOR[difficulty] ?? ''}`}>
              {DIFFICULTY_LABEL[difficulty] ?? `Lv.${difficulty}`}
            </span>
          )}
        </div>

        {/* 기본 정보 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
          {space?.length > 0 && <span>장소: {space.join(', ')}</span>}
          {groupSize && <span>인원: {groupSize.min}~{groupSize.max}명</span>}
          {durationMin && <span>시간: {durationMin}분</span>}
        </div>

        {/* 준비물 */}
        {equipment?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {equipment.map((item) => (
              <span key={item} className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {item}
              </span>
            ))}
          </div>
        )}

        {/* 구분선 */}
        <hr className="border-gray-100 mb-1" />

        {/* ACE 수업 흐름 (aceLesson이 있을 때) */}
        {hasAceLesson && (
          <div>
            {/* 편집 버튼 행 */}
            <div className="flex items-center justify-end gap-2 mt-2">
              {isEditingAce ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="text-[11px] px-3 py-1 rounded-lg bg-[#7C9EF5] text-white font-medium hover:opacity-90 transition-all"
                  >
                    저장
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-[11px] px-3 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-all"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleStartEdit}
                    className="text-[11px] px-3 py-1 rounded-lg bg-[#7C9EF5]/10 text-[#7C9EF5] font-medium hover:bg-[#7C9EF5]/20 transition-all"
                  >
                    편집
                  </button>
                  {isEdited && (
                    <button
                      onClick={handleRevert}
                      className="text-[11px] px-3 py-1 rounded-lg bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition-all"
                    >
                      원본 복원
                    </button>
                  )}
                </>
              )}
            </div>

            <AceLessonFlow
              aceLesson={activeAceLesson}
              isEditing={isEditingAce}
              onAceLessonChange={setEditingAceLesson}
            />
          </div>
        )}

        {/* 기존 단순 수업 흐름 (aceLesson이 없을 때) */}
        {!hasAceLesson && flow?.length > 0 && (
          <>
            <SectionTitle>수업 흐름</SectionTitle>
            <ol className="text-xs text-gray-600 leading-relaxed space-y-1 list-decimal list-inside">
              {flow.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </>
        )}

        {/* 규칙 (aceLesson 없을 때만) */}
        {!hasAceLesson && rules?.length > 0 && (
          <>
            <SectionTitle>규칙</SectionTitle>
            <ul className="text-xs text-gray-600 leading-relaxed space-y-1 list-disc list-inside">
              {rules.map((rule, i) => <li key={i}>{rule}</li>)}
            </ul>
          </>
        )}

        {/* FMS 기술 + 체력요소 */}
        {(fmsSkills?.length > 0 || fitnessComponents?.length > 0) && (
          <>
            <SectionTitle>FMS 기술 / 체력요소</SectionTitle>
            <div className="flex flex-wrap gap-1">
              {fmsSkills?.map((skill) => (
                <span key={skill} className="text-[11px] bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">
                  {skill}
                </span>
              ))}
              {fitnessComponents?.map((comp) => (
                <span key={comp} className="text-[11px] bg-violet-50 text-violet-600 rounded-full px-2 py-0.5">
                  {comp}
                </span>
              ))}
            </div>
          </>
        )}

        {/* 교사 팁 (폴딩) */}
        {teachingTips?.length > 0 && (
          <CollapsibleSection title="교사 팁">
            <ul className="text-xs text-gray-600 leading-relaxed space-y-1">
              {teachingTips.map((tip, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-amber-400 flex-shrink-0">&#9679;</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* 시간표 배정 버튼 */}
        {onAssignToSchedule && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => onAssignToSchedule(activity)}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
            >
              <span>📅</span> 시간표에 배정하기
            </button>
          </div>
        )}

        {/* 아이디어 팁 패널 (Wave 4) */}
        <IdeaTipPanel
          activity={activity}
          relatedActivities={relatedActivities}
          onActivitySwitch={onActivitySwitch}
        />
      </div>
    </Modal>
  )
}
