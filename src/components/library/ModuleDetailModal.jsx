// 모듈 상세/편집 모달 — 읽기/편집 토글 + 원본 복원 | Modal→common/Modal.jsx
import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import toast from 'react-hot-toast'

const TYPE_LABELS = {
  sports: '종목',
  skills: '기술',
  activities: '활동',
  modifiers: '변형',
}

// --- Field schemas per type ---
const FIELD_SCHEMAS = {
  sports: [
    { key: 'name', label: '종목명', type: 'text' },
    { key: 'domain', label: '영역', type: 'text' },
    { key: 'subDomain', label: '중영역', type: 'text' },
    { key: 'fmsGroup', label: 'FMS 그룹', type: 'array' },
    { key: 'coreRules', label: '핵심 규칙', type: 'array' },
    { key: 'safetyRules', label: '안전 수칙', type: 'array' },
    { key: 'defaultEquipment', label: '기본 장비', type: 'array' },
    { key: 'requiredConcepts', label: '필수 개념', type: 'array' },
  ],
  skills: [
    { key: 'name', label: '기술명', type: 'text' },
    { key: 'sport', label: '종목', type: 'text' },
    { key: 'fms', label: 'FMS', type: 'array' },
    { key: 'fmsCategory', label: 'FMS 분류', type: 'text' },
    { key: 'gradeRange', label: '학년', type: 'array' },
    { key: 'equipment', label: '장비', type: 'array' },
    { key: 'teachingCues', label: '교사 큐', type: 'array' },
    { key: 'commonErrors', label: '주요 오류', type: 'array' },
    { key: 'quickFixes', label: '교정법', type: 'array' },
    { key: 'slotMapping', label: '슬롯 매핑', type: 'object' },
    { key: 'description', label: '설명', type: 'text' },
  ],
  activities: [
    { key: 'name', label: '활동명', type: 'text' },
    { key: 'sportId', label: '종목 ID', type: 'text' },
    { key: 'suitablePhase', label: '적합 단계', type: 'text' },
    { key: 'space', label: '장소', type: 'array' },
    { key: 'groupSize', label: '인원', type: 'number' },
    { key: 'baseDurationMin', label: '기본 시간(분)', type: 'number' },
    { key: 'flow', label: '수업 흐름', type: 'array' },
    { key: 'teachingTips', label: '교사 팁', type: 'array' },
    { key: 'equipment', label: '준비물', type: 'array' },
    { key: 'description', label: '설명', type: 'text' },
  ],
  modifiers: [
    { key: 'name', label: '변형명', type: 'text' },
    { key: 'type', label: '유형', type: 'text' },
    { key: 'suitablePhase', label: '적합 단계', type: 'text' },
    { key: 'ruleOverride', label: '규칙 변경', type: 'text' },
    { key: 'teacherMeaning', label: '교육적 의미', type: 'text' },
    { key: 'setupExample', label: '세팅 예시', type: 'text' },
    { key: 'scoringExample', label: '채점 예시', type: 'text' },
    { key: 'sportAllow', label: '적용 종목', type: 'array' },
    { key: 'space', label: '장소', type: 'array' },
    { key: 'equipmentNeeded', label: '필요 장비', type: 'array' },
  ],
}

function ReadOnlyField({ label, value, type }) {
  if (type === 'array') {
    const arr = Array.isArray(value) ? value : []
    if (arr.length === 0) return null
    return (
      <div className="mb-3">
        <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</label>
        <div className="flex flex-wrap gap-1">
          {arr.map((v, i) => (
            <span key={i} className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{v}</span>
          ))}
        </div>
      </div>
    )
  }
  if (type === 'object') {
    if (!value || typeof value !== 'object') return null
    return (
      <div className="mb-3">
        <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</label>
        <div className="space-y-0.5">
          {Object.entries(value).map(([k, v]) => (
            <p key={k} className="text-[11px] text-gray-600">
              <span className="font-medium text-gray-700">{k}</span>: {v}
            </p>
          ))}
        </div>
      </div>
    )
  }
  if (value == null || value === '') return null
  return (
    <div className="mb-3">
      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</label>
      <p className="text-xs text-gray-700">{String(value)}</p>
    </div>
  )
}

function EditableField({ label, value, type, onChange }) {
  if (type === 'array') {
    const arr = Array.isArray(value) ? value : []
    const text = arr.join(', ')
    return (
      <div className="mb-3">
        <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</label>
        <input
          type="text"
          value={text}
          onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-[#F5A67C] focus:ring-1 focus:ring-[#F5A67C]/30 outline-none bg-white/80"
          placeholder="쉼표로 구분"
        />
      </div>
    )
  }
  if (type === 'object') {
    if (!value || typeof value !== 'object') return null
    return (
      <div className="mb-3">
        <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</label>
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium text-gray-500 w-20 shrink-0 truncate">{k}</span>
            <input
              type="text"
              value={v}
              onChange={(e) => onChange({ ...value, [k]: e.target.value })}
              className="flex-1 px-2 py-1 text-xs rounded-lg border border-gray-200 focus:border-[#F5A67C] outline-none bg-white/80"
            />
          </div>
        ))}
      </div>
    )
  }
  if (type === 'number') {
    return (
      <div className="mb-3">
        <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</label>
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-[#F5A67C] focus:ring-1 focus:ring-[#F5A67C]/30 outline-none bg-white/80"
        />
      </div>
    )
  }
  return (
    <div className="mb-3">
      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-[#F5A67C] focus:ring-1 focus:ring-[#F5A67C]/30 outline-none bg-white/80"
      />
    </div>
  )
}

export default function ModuleDetailModal({ item, type, onClose, onUpdate, onDelete, onRestore }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})

  const schema = FIELD_SCHEMAS[type] || []
  const isCustom = item?._source === 'custom'
  const isEditedItem = item?._source === 'edited'

  useEffect(() => {
    if (item) setEditData({ ...item })
  }, [item])

  if (!item) return null

  const handleSave = () => {
    const { _source, ...updates } = editData
    onUpdate(type, item.id, updates)
    setIsEditing(false)
    toast.success('저장되었습니다')
  }

  const handleDelete = () => {
    onDelete(type, item.id)
    onClose()
    toast.success('삭제되었습니다')
  }

  const handleRestore = () => {
    onRestore(type, item.id)
    setIsEditing(false)
    onClose()
    toast.success('원본으로 복원되었습니다')
  }

  const handleFieldChange = (key, value) => {
    setEditData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      <div className="max-h-[80vh] overflow-y-auto -mx-6 px-6 -my-6 py-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="sticky top-0 float-right z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-4 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium text-gray-400 uppercase">{TYPE_LABELS[type]}</span>
            {item._source !== 'base' && (
              <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium border ${
                isCustom
                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                {isCustom ? '직접 추가' : '편집됨'}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">ID: {item.id}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-4">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-[#F5A67C] text-white font-medium hover:opacity-90 transition-all"
              >
                저장
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditData({ ...item }) }}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-all"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-[#F5A67C]/10 text-[#F5A67C] font-medium hover:bg-[#F5A67C]/20 transition-all"
              >
                편집
              </button>
              {isEditedItem && (
                <button
                  onClick={handleRestore}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition-all"
                >
                  원본 복원
                </button>
              )}
              {(isCustom || isEditedItem) && (
                <button
                  onClick={handleDelete}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-red-50 text-red-500 font-medium hover:bg-red-100 transition-all"
                >
                  삭제
                </button>
              )}
            </>
          )}
        </div>

        <hr className="border-gray-100 mb-4" />

        {/* Fields */}
        {schema.map((field) =>
          isEditing ? (
            <EditableField
              key={field.key}
              label={field.label}
              value={editData[field.key]}
              type={field.type}
              onChange={(val) => handleFieldChange(field.key, val)}
            />
          ) : (
            <ReadOnlyField
              key={field.key}
              label={field.label}
              value={item[field.key]}
              type={field.type}
            />
          )
        )}
      </div>
    </Modal>
  )
}
