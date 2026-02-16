// 모듈 추가 폼 — 타입별 동적 필드 | GlassCard→common/GlassCard.jsx
import { useState } from 'react'
import GlassCard from '../common/GlassCard'

const TYPE_LABELS = {
  sports: '종목',
  skills: '기술',
  activities: '활동',
  modifiers: '변형',
}

const REQUIRED_FIELDS = {
  sports: [
    { key: 'name', label: '종목명', placeholder: '예: 발야구' },
    { key: 'domain', label: '영역', placeholder: '예: 스포츠' },
    { key: 'subDomain', label: '중영역', placeholder: '예: 필드형' },
  ],
  skills: [
    { key: 'name', label: '기술명', placeholder: '예: 오버핸드 패스' },
    { key: 'sport', label: '종목', placeholder: '예: 배구' },
    { key: 'description', label: '설명', placeholder: '기술 설명' },
  ],
  activities: [
    { key: 'name', label: '활동명', placeholder: '예: 4대4 미니 축구' },
    { key: 'suitablePhase', label: '적합 단계', placeholder: '기본 / 응용 / 챌린지' },
    { key: 'description', label: '설명', placeholder: '활동 설명' },
  ],
  modifiers: [
    { key: 'name', label: '변형명', placeholder: '예: 파워업 존' },
    { key: 'type', label: '유형', placeholder: '라운드구성 / 점수조건 / 역할전환 등' },
    { key: 'ruleOverride', label: '규칙 변경', placeholder: '적용할 규칙 변경 내용' },
  ],
}

const ARRAY_FIELDS = {
  sports: [
    { key: 'fmsGroup', label: 'FMS 그룹', placeholder: '쉼표로 구분' },
    { key: 'coreRules', label: '핵심 규칙', placeholder: '쉼표로 구분' },
    { key: 'safetyRules', label: '안전 수칙', placeholder: '쉼표로 구분' },
    { key: 'defaultEquipment', label: '기본 장비', placeholder: '쉼표로 구분' },
  ],
  skills: [
    { key: 'fms', label: 'FMS', placeholder: '쉼표로 구분' },
    { key: 'teachingCues', label: '교사 큐', placeholder: '쉼표로 구분' },
    { key: 'equipment', label: '장비', placeholder: '쉼표로 구분' },
  ],
  activities: [
    { key: 'space', label: '장소', placeholder: '교실, 체육관, 운동장' },
    { key: 'flow', label: '수업 흐름', placeholder: '쉼표로 구분' },
    { key: 'equipment', label: '준비물', placeholder: '쉼표로 구분' },
    { key: 'teachingTips', label: '교사 팁', placeholder: '쉼표로 구분' },
  ],
  modifiers: [
    { key: 'sportAllow', label: '적용 종목', placeholder: '쉼표로 구분' },
    { key: 'space', label: '장소', placeholder: '쉼표로 구분' },
    { key: 'equipmentNeeded', label: '필요 장비', placeholder: '쉼표로 구분' },
  ],
}

export default function ModuleAddForm({ type, onSave, onCancel }) {
  const [formData, setFormData] = useState({})
  const [arrayData, setArrayData] = useState({})

  const requiredFields = REQUIRED_FIELDS[type] || []
  const arrayFields = ARRAY_FIELDS[type] || []
  const canSave = requiredFields.length > 0 && requiredFields[0] && (formData[requiredFields[0].key] || '').trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    const item = { ...formData }
    // Convert array field strings to arrays
    for (const field of arrayFields) {
      const raw = arrayData[field.key] || ''
      item[field.key] = raw.split(',').map((s) => s.trim()).filter(Boolean)
    }
    onSave(type, item)
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <h4 className="text-sm font-bold text-gray-900 mb-3">
          {TYPE_LABELS[type]} 추가
        </h4>
        <div className="space-y-3">
          {requiredFields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {field.label} {field === requiredFields[0] && <span className="text-red-400">*</span>}
              </label>
              <input
                type="text"
                value={formData[field.key] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#F5A67C] focus:ring-1 focus:ring-[#F5A67C]/30 outline-none transition-colors bg-white/80"
              />
            </div>
          ))}
        </div>
      </GlassCard>

      {arrayFields.length > 0 && (
        <GlassCard className="p-5">
          <h4 className="text-xs font-semibold text-gray-500 mb-3">추가 정보</h4>
          <div className="space-y-3">
            {arrayFields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{field.label}</label>
                <input
                  type="text"
                  value={arrayData[field.key] || ''}
                  onChange={(e) => setArrayData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#F5A67C] focus:ring-1 focus:ring-[#F5A67C]/30 outline-none transition-colors bg-white/80"
                />
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Buttons */}
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
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#F5A67C] hover:bg-[#e0956d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          저장
        </button>
      </div>
    </div>
  )
}
