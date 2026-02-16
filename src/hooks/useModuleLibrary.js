// 모듈 데이터 CRUD — sports/skills/activities/modifiers JSON 기반 + localStorage override | 데이터→src/data/modules/
import { useMemo, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import sportsData from '../data/modules/sports.json'
import skillsData from '../data/modules/skills.json'
import activitiesData from '../data/modules/activities.json'
import modifiersData from '../data/modules/modifiers.json'

const BASE_DATA = {
  sports: sportsData.sports,
  skills: skillsData.skills,
  activities: activitiesData.activities,
  modifiers: modifiersData.modifiers,
}

export function useModuleLibrary() {
  const [overrides, setOverrides] = useLocalStorage('module_overrides', {})
  const [deletedIds, setDeletedIds] = useLocalStorage('module_deleted_ids', {})

  // --- Base item lookup ---
  const getBaseItem = useCallback((type, id) => {
    return BASE_DATA[type]?.find((item) => item.id === id) ?? null
  }, [])

  // --- Merged list: base + overrides, excluding deleted ---
  const getMergedList = useCallback((type) => {
    const base = BASE_DATA[type] || []
    const typeOverrides = overrides?.[type] || {}
    const typeDeleted = new Set(deletedIds?.[type] || [])

    // Base items (with overrides applied, excluding deleted)
    const merged = base
      .filter((item) => !typeDeleted.has(item.id))
      .map((item) => {
        if (typeOverrides[item.id]) {
          return { ...item, ...typeOverrides[item.id], _source: 'edited' }
        }
        return { ...item, _source: 'base' }
      })

    // Custom items (added by user, not in base)
    const baseIds = new Set(base.map((item) => item.id))
    for (const [id, data] of Object.entries(typeOverrides)) {
      if (!baseIds.has(id) && !typeDeleted.has(id)) {
        merged.push({ ...data, id, _source: 'custom' })
      }
    }

    return merged
  }, [overrides, deletedIds])

  // --- Get single item by type + id ---
  const getItemById = useCallback((type, id) => {
    const typeDeleted = new Set(deletedIds?.[type] || [])
    if (typeDeleted.has(id)) return null

    const typeOverrides = overrides?.[type] || {}
    const base = getBaseItem(type, id)

    if (typeOverrides[id]) {
      if (base) {
        return { ...base, ...typeOverrides[id], _source: 'edited' }
      }
      return { ...typeOverrides[id], id, _source: 'custom' }
    }

    return base ? { ...base, _source: 'base' } : null
  }, [overrides, deletedIds, getBaseItem])

  // --- Update item (creates override) ---
  const updateItem = useCallback((type, id, updates) => {
    setOverrides((prev) => {
      const next = { ...prev }
      const typeMap = { ...(next[type] || {}) }
      typeMap[id] = { ...(typeMap[id] || {}), ...updates }
      next[type] = typeMap
      return next
    })
  }, [setOverrides])

  // --- Add new custom item ---
  const addItem = useCallback((type, item) => {
    const id = item.id || `custom_${type}_${Date.now()}`
    setOverrides((prev) => {
      const next = { ...prev }
      const typeMap = { ...(next[type] || {}) }
      typeMap[id] = { ...item, id }
      next[type] = typeMap
      return next
    })
    return id
  }, [setOverrides])

  // --- Delete item (soft delete) ---
  const deleteItem = useCallback((type, id) => {
    setDeletedIds((prev) => {
      const next = { ...prev }
      const typeList = [...(next[type] || [])]
      if (!typeList.includes(id)) typeList.push(id)
      next[type] = typeList
      return next
    })
  }, [setDeletedIds])

  // --- Restore deleted item ---
  const restoreItem = useCallback((type, id) => {
    // Remove from deleted list
    setDeletedIds((prev) => {
      const next = { ...prev }
      const typeList = (next[type] || []).filter((did) => did !== id)
      if (typeList.length > 0) {
        next[type] = typeList
      } else {
        delete next[type]
      }
      return next
    })
    // Remove overrides to restore to base
    setOverrides((prev) => {
      const next = { ...prev }
      const typeMap = { ...(next[type] || {}) }
      delete typeMap[id]
      if (Object.keys(typeMap).length > 0) {
        next[type] = typeMap
      } else {
        delete next[type]
      }
      return next
    })
  }, [setDeletedIds, setOverrides])

  // --- Restore edited item to base (remove override, keep item) ---
  const restoreToBase = useCallback((type, id) => {
    setOverrides((prev) => {
      const next = { ...prev }
      const typeMap = { ...(next[type] || {}) }
      delete typeMap[id]
      if (Object.keys(typeMap).length > 0) {
        next[type] = typeMap
      } else {
        delete next[type]
      }
      return next
    })
  }, [setOverrides])

  // --- Check if item has been edited ---
  const isEdited = useCallback((type, id) => {
    return !!(overrides?.[type]?.[id])
  }, [overrides])

  // --- Stats ---
  const stats = useMemo(() => {
    const result = {}
    for (const type of Object.keys(BASE_DATA)) {
      const base = BASE_DATA[type].length
      const customCount = Object.keys(overrides?.[type] || {}).filter(
        (id) => !BASE_DATA[type].some((b) => b.id === id)
      ).length
      const editedCount = Object.keys(overrides?.[type] || {}).filter(
        (id) => BASE_DATA[type].some((b) => b.id === id)
      ).length
      const deletedCount = (deletedIds?.[type] || []).length
      result[type] = { base, custom: customCount, edited: editedCount, deleted: deletedCount, total: base + customCount - deletedCount }
    }
    return result
  }, [overrides, deletedIds])

  return {
    getMergedList,
    getItemById,
    getBaseItem,
    updateItem,
    addItem,
    deleteItem,
    restoreItem,
    restoreToBase,
    isEdited,
    stats,
  }
}
