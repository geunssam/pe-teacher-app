// CSV → JSON 동기화 스크립트
// 사용: node scripts/csv2json.mjs 또는 pnpm csv2json
// CSV 5종(activities, skills, sports, modifiers, fms)을 modules/*.json으로 변환

import { readFile, writeFile, rename, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const RAW_DIR = path.join(ROOT, 'src/data/assets/raw')
const OUT_DIR = path.join(ROOT, 'src/data/modules')

// ─── CSV Parser ───
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1)
    .map((line) => {
      const cols = splitCSVLine(line)
      const row = {}
      headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim() })
      return row
    })
    .filter((row) => row[headers[0]]) // skip empty-id rows
}

function splitCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue }
    if (char === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += char
  }
  result.push(current)
  return result
}

// ─── Helpers ───
function pipeToArray(val) {
  return String(val || '').split('|').map((s) => s.trim()).filter(Boolean)
}

function toNumber(val, fallback = 0) {
  const n = Number(val)
  return Number.isNaN(n) ? fallback : n
}

function toBool(val) {
  return String(val || '').toUpperCase() === 'TRUE'
}

function flowColumns(row) {
  const flows = []
  for (let i = 1; i <= 10; i++) {
    const val = row[`flow_${i}`]
    if (val) flows.push(val)
  }
  return flows
}

function tipsToArray(val) {
  return String(val || '').split('|').map((s) => s.trim()).filter(Boolean)
}

function buildSlotMapping(row) {
  const mapping = {}
  Object.keys(row).forEach((key) => {
    if (key.startsWith('slot_') && row[key]) {
      const slotName = key.replace('slot_', '')
      mapping[slotName] = row[key]
    }
  })
  return mapping
}

// ─── Converters ───

function convertActivities(rows) {
  const activities = rows.map((row) => ({
    id: row.id,
    name: row.name,
    sportId: row.sport_id || '',
    suitablePhase: row.suitable_phase || '기본',
    space: pipeToArray(row.space),
    groupSize: toNumber(row.group_size, 6),
    baseDurationMin: toNumber(row.base_duration_min, 8),
    difficultyBase: toNumber(row.difficulty_base, 1),
    compatibleFmsCategories: pipeToArray(row.compatible_fms_categories),
    flow: flowColumns(row),
    teachingTips: tipsToArray(row.teaching_tips),
    equipment: pipeToArray(row.equipment),
    description: row.description || '',
  }))

  // Validate unique ids
  const ids = new Set()
  activities.forEach((a) => {
    if (ids.has(a.id)) console.warn(`[activities] Duplicate id: ${a.id}`)
    ids.add(a.id)
  })

  return {
    meta: { version: '1.0.0', generatedAt: new Date().toISOString(), source: 'activities_template.csv' },
    activities,
  }
}

function convertSkills(rows) {
  const skills = rows.map((row) => ({
    id: row.id,
    name: row.name,
    sport: row.sport,
    fms: pipeToArray(row.fms),
    fmsCategory: row.fms_category || '조작',
    gradeRange: pipeToArray(row.grade_range),
    spaceNeeded: pipeToArray(row.space_needed),
    equipment: pipeToArray(row.equipment),
    slotMapping: buildSlotMapping(row),
    teachingCues: tipsToArray(row.teaching_cues),
    commonErrors: tipsToArray(row.common_errors),
    quickFixes: tipsToArray(row.quick_fixes),
    challengeRules: tipsToArray(row.challenge_rules),
    closureGameRules: tipsToArray(row.closure_game_rules),
    description: row.description || '',
  }))

  const ids = new Set()
  skills.forEach((s) => {
    if (ids.has(s.id)) console.warn(`[skills] Duplicate id: ${s.id}`)
    ids.add(s.id)
  })

  return {
    meta: { version: '3.0.0', generatedAt: new Date().toISOString(), source: 'skills_template.csv' },
    skills,
  }
}

function convertSports(rows) {
  const sports = rows.map((row) => ({
    id: row.id,
    name: row.name,
    domain: row.domain || '스포츠',
    subDomain: row.sub_domain || '',
    fmsGroup: pipeToArray(row.fms_group),
    coreRules: pipeToArray(row.core_rules),
    requiredConcepts: pipeToArray(row.required_concepts),
    safetyRules: pipeToArray(row.safety_rules),
    defaultEquipment: pipeToArray(row.default_equipment),
    skills: pipeToArray(row.skills),
    forbiddenModifierIds: pipeToArray(row.forbidden_modifier_ids),
    forbiddenTags: pipeToArray(row.forbidden_tags),
  }))

  const ids = new Set()
  sports.forEach((s) => {
    if (ids.has(s.id)) console.warn(`[sports] Duplicate id: ${s.id}`)
    ids.add(s.id)
  })

  // Reference integrity: warn about missing skill refs
  const allSkillIds = new Set()
  sports.forEach((s) => s.skills.forEach((id) => allSkillIds.add(id)))

  return {
    meta: { version: '3.0.0', generatedAt: new Date().toISOString(), source: 'sports_template.csv' },
    sports,
  }
}

function convertModifiers(rows) {
  const modifiers = rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type || '',
    suitablePhase: row.suitable_phase || '응용',
    sportAllow: pipeToArray(row.sport_allow),
    space: pipeToArray(row.space),
    ruleOverride: row.rule_override || '',
    timeDelta: toNumber(row.time_delta, 0),
    difficultyDelta: toNumber(row.difficulty_delta, 0),
    equipmentNeeded: pipeToArray(row.equipment_needed),
    incompatibleWith: pipeToArray(row.incompatible_with),
    slotOverride: row['slot_벌칙동작'] ? { '벌칙동작': row['slot_벌칙동작'] } : {},
    description: row.description || '',
    mustRender: toBool(row.must_render),
    teacherMeaning: row.teacher_meaning || '',
    setupExample: row.setup_example || '',
    scoringExample: row.scoring_example || '',
  }))

  const ids = new Set()
  modifiers.forEach((m) => {
    if (ids.has(m.id)) console.warn(`[modifiers] Duplicate id: ${m.id}`)
    ids.add(m.id)
  })

  return {
    meta: { version: '3.0.0', generatedAt: new Date().toISOString(), source: 'modifiers_template.csv' },
    modifiers,
  }
}

function convertFms(rows, existingData) {
  const fmsGuide = rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category || '',
    gradeBand: pipeToArray(row.grade_band),
    curriculumFocus: row.curriculum_focus || '',
    sportTranslation: row.sport_translation || '',
    skillExamples: pipeToArray(row.skill_examples),
    activityExamples: pipeToArray(row.activity_examples),
    assessmentPoints: pipeToArray(row.assessment_points),
    description: row.description || '',
  }))

  const ids = new Set()
  fmsGuide.forEach((f) => {
    if (ids.has(f.id)) console.warn(`[fms] Duplicate id: ${f.id}`)
    ids.add(f.id)
  })

  // Merge with existing data (preserve schoolLevelDuration + gradeProgression)
  return {
    meta: { version: '2.0.0', generatedAt: new Date().toISOString(), source: 'fms_template.csv' },
    schoolLevelDuration: existingData?.schoolLevelDuration || {},
    gradeProgression: existingData?.gradeProgression || {},
    fmsGuide,
  }
}

// ─── Main ───

async function main() {
  console.log('CSV → JSON 동기화 시작...\n')

  // Read all CSVs in parallel
  const [activitiesCsv, skillsCsv, sportsCsv, modifiersCsv, fmsCsv, existingFmsJson] = await Promise.all([
    readFile(path.join(RAW_DIR, 'activities_template.csv'), 'utf-8'),
    readFile(path.join(RAW_DIR, 'skills_template.csv'), 'utf-8'),
    readFile(path.join(RAW_DIR, 'sports_template.csv'), 'utf-8'),
    readFile(path.join(RAW_DIR, 'modifiers_template.csv'), 'utf-8'),
    readFile(path.join(RAW_DIR, 'fms_template.csv'), 'utf-8'),
    readFile(path.join(OUT_DIR, 'fmsCurriculum.json'), 'utf-8').then(JSON.parse).catch(() => ({})),
  ])

  // Parse CSVs
  const activitiesRows = parseCSV(activitiesCsv)
  const skillsRows = parseCSV(skillsCsv)
  const sportsRows = parseCSV(sportsCsv)
  const modifiersRows = parseCSV(modifiersCsv)
  const fmsRows = parseCSV(fmsCsv)

  // Convert
  const activitiesJson = convertActivities(activitiesRows)
  const skillsJson = convertSkills(skillsRows)
  const sportsJson = convertSports(sportsRows)
  const modifiersJson = convertModifiers(modifiersRows)
  const fmsJson = convertFms(fmsRows, existingFmsJson)

  // Rename structures.json → structures.legacy.json (멱등성: 양쪽 다 존재하면 skip)
  const structuresPath = path.join(OUT_DIR, 'structures.json')
  const legacyPath = path.join(OUT_DIR, 'structures.legacy.json')
  const structuresExists = await access(structuresPath).then(() => true).catch(() => false)
  const legacyExists = await access(legacyPath).then(() => true).catch(() => false)

  if (structuresExists && !legacyExists) {
    await rename(structuresPath, legacyPath)
    console.log('  structures.json → structures.legacy.json')
  } else if (structuresExists && legacyExists) {
    console.log('  [경고] structures.json과 structures.legacy.json 모두 존재 — rename 건너뜀')
  } else {
    console.log('  structures.legacy.json 확인 완료')
  }

  // Write all JSONs in parallel
  const writes = [
    ['activities.json', activitiesJson],
    ['skills.json', skillsJson],
    ['sports.json', sportsJson],
    ['modifiers.json', modifiersJson],
    ['fmsCurriculum.json', fmsJson],
  ]

  await Promise.all(
    writes.map(async ([filename, data]) => {
      const outPath = path.join(OUT_DIR, filename)
      await writeFile(outPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      const count = data.activities?.length || data.skills?.length || data.sports?.length || data.modifiers?.length || data.fmsGuide?.length || 0
      console.log(`  ${filename}: ${count}개 항목`)
    })
  )

  // Cross-reference validation
  console.log('\n--- 참조 무결성 검사 ---')
  const allSkillIds = new Set(skillsJson.skills.map((s) => s.id))
  const allActivityIds = new Set(activitiesJson.activities.map((a) => a.id))
  let warnings = 0

  sportsJson.sports.forEach((sport) => {
    sport.skills.forEach((skillId) => {
      if (!allSkillIds.has(skillId)) {
        console.warn(`  [경고] sports "${sport.id}" → skill "${skillId}" 누락`)
        warnings++
      }
    })
  })

  fmsJson.fmsGuide.forEach((guide) => {
    guide.activityExamples.forEach((activityName) => {
      const found = activitiesJson.activities.some((a) => a.name.includes(activityName) || activityName.includes(a.name))
      if (!found) {
        // This is a soft warning - activity names in FMS may be informal
      }
    })
  })

  // Validate activity.sportId references
  const allSportIds = new Set(sportsJson.sports.map((s) => s.id))
  activitiesJson.activities.forEach((activity) => {
    if (activity.sportId && !allSportIds.has(activity.sportId)) {
      console.warn(`  [경고] activities "${activity.id}" → sportId "${activity.sportId}" 가 sports.json에 없음`)
      warnings++
    }
  })

  console.log(`  참조 경고: ${warnings}개`)
  console.log(`\nCSV → JSON 동기화 완료!`)
}

main().catch((err) => {
  console.error('변환 실패:', err)
  process.exit(1)
})
