// 자료실 페이지 — 종목/기술/활동/변형 서브탭 + 검색 + CRUD | 훅→useModuleLibrary, 컴포넌트→components/library/
import { useState, useMemo } from 'react'
import { useModuleLibrary } from '../hooks/useModuleLibrary'
import ModuleItemCard from '../components/library/ModuleItemCard'
import ModuleDetailModal from '../components/library/ModuleDetailModal'
import ModuleAddForm from '../components/library/ModuleAddForm'
import toast from 'react-hot-toast'

const SUB_TABS = [
  { key: 'sports', label: '종목', emoji: '⚽' },
  { key: 'skills', label: '기술', emoji: '🎯' },
  { key: 'activities', label: '활동', emoji: '🏃' },
  { key: 'modifiers', label: '변형', emoji: '🔧' },
]

export default function LibraryPage() {
  const {
    getMergedList,
    updateItem,
    addItem,
    deleteItem,
    restoreToBase,
    stats,
  } = useModuleLibrary()

  const [activeTab, setActiveTab] = useState('sports')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [isAddMode, setIsAddMode] = useState(false)

  // Filtered list
  const filteredList = useMemo(() => {
    const list = getMergedList(activeTab)
    if (!searchQuery.trim()) return list
    const q = searchQuery.trim().toLowerCase()
    return list.filter((item) => {
      const name = (item.name || '').toLowerCase()
      const desc = (item.description || '').toLowerCase()
      const sport = (item.sport || item.domain || '').toLowerCase()
      return name.includes(q) || desc.includes(q) || sport.includes(q)
    })
  }, [getMergedList, activeTab, searchQuery])

  const currentStats = stats[activeTab] || {}

  // Add handler
  const handleAdd = (type, item) => {
    addItem(type, item)
    setIsAddMode(false)
    toast.success('추가되었습니다')
  }

  // Tab change resets view
  const handleTabChange = (key) => {
    setActiveTab(key)
    setSearchQuery('')
    setIsAddMode(false)
    setSelectedItem(null)
  }

  return (
    <div className="page-container max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">자료실</h1>
        <p className="text-xs text-gray-400 mt-1">
          수업 설계에 사용되는 종목, 기술, 활동, 변형 자료를 관리합니다
        </p>
      </div>

      {/* Sub-tab chips */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {SUB_TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeTab === key
                ? 'bg-[#F5A67C] text-white border-[#F5A67C]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#F5A67C]/50'
            }`}
          >
            {emoji} {label}
            <span className="ml-1 text-[10px] opacity-70">{stats[key]?.total ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Add form mode */}
      {isAddMode ? (
        <ModuleAddForm
          type={activeTab}
          onSave={handleAdd}
          onCancel={() => setIsAddMode(false)}
        />
      ) : (
        <>
          {/* Search + Add button */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#F5A67C] focus:ring-1 focus:ring-[#F5A67C]/30 outline-none transition-colors bg-white/80"
              />
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <button
              onClick={() => setIsAddMode(true)}
              className="shrink-0 w-10 h-10 rounded-xl bg-[#F5A67C] text-white flex items-center justify-center text-xl font-light hover:bg-[#e0956d] transition-colors shadow-sm"
            >
              +
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-3 mb-4 text-[11px] text-gray-400">
            <span>전체 {currentStats.total ?? 0}</span>
            {currentStats.edited > 0 && <span className="text-blue-500">편집 {currentStats.edited}</span>}
            {currentStats.custom > 0 && <span className="text-orange-500">추가 {currentStats.custom}</span>}
          </div>

          {/* List */}
          {filteredList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">
                {searchQuery ? '검색 결과가 없습니다' : '아직 자료가 없습니다'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredList.map((item) => (
                <ModuleItemCard
                  key={item.id}
                  item={item}
                  type={activeTab}
                  onClick={setSelectedItem}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <ModuleDetailModal
          item={selectedItem}
          type={activeTab}
          onClose={() => setSelectedItem(null)}
          onUpdate={(type, id, updates) => {
            updateItem(type, id, updates)
            setSelectedItem(null)
          }}
          onDelete={(type, id) => {
            deleteItem(type, id)
            setSelectedItem(null)
          }}
          onRestore={(type, id) => {
            restoreToBase(type, id)
            setSelectedItem(null)
          }}
        />
      )}
    </div>
  )
}
