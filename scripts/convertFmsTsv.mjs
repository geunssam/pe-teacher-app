import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_INPUT = '/Users/iwongeun/Downloads/기본 움직임 기술 분류 및 2022 개정 교육과정 연계 - Table 1.tsv'
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'src/data/fmsTaxonomy.json')

const CATEGORY_MAP = [
  { key: '비이동', match: '비이동 움직임' },
  { key: '이동', match: '이동 움직임' },
  { key: '조작', match: '조작 움직임' },
]

function toCategory(raw) {
  const trimmed = String(raw ?? '').trim()
  const matched = CATEGORY_MAP.find((item) => trimmed.includes(item.match))

  if (!matched) {
    return {
      category: trimmed,
      label: trimmed,
      aliases: [],
    }
  }

  const label = trimmed.replace(/\s*\([^)]*\)\s*/g, '').trim()
  const paren = trimmed.match(/\(([^)]*)\)/)
  const aliases = paren
    ? paren[1]
        .split('/')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

  return {
    category: matched.key,
    label,
    aliases,
  }
}

function splitSmart(raw) {
  const text = String(raw ?? '')
  const results = []
  let buffer = ''
  let depth = 0

  for (const char of text) {
    if (char === '(') {
      depth += 1
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1)
    }

    if (char === ',' && depth === 0) {
      const item = buffer.trim()
      if (item) {
        results.push(item)
      }
      buffer = ''
      continue
    }

    buffer += char
  }

  if (buffer.trim()) {
    results.push(buffer.trim())
  }

  return results
}

function parseSkill(skillText) {
  const match = skillText.match(/^([^()]+?)(?:\((.*)\))?$/)
  if (!match) {
    return {
      name: skillText.trim(),
      aliases: [],
    }
  }

  const name = match[1].trim()
  const aliases = (match[2] ?? '')
    .split(/[\/,&]/)
    .map((alias) => alias.trim())
    .filter(Boolean)

  return { name, aliases }
}

function parseGradeFocus(raw) {
  return String(raw ?? '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const [target, ...rest] = segment.split(':')
      if (rest.length === 0) {
        return {
          grade: target.trim(),
          focus: '',
        }
      }

      return {
        grade: target.trim(),
        focus: rest.join(':').trim(),
      }
    })
}

function normalizeRows(lines) {
  const [headerLine, ...rowLines] = lines.filter((line) => line.trim().length > 0)
  if (!headerLine) {
    return []
  }

  const headers = headerLine.split('\t').map((item) => item.trim())

  return rowLines.map((line) => {
    const cols = line.split('\t')
    const entry = {}

    headers.forEach((header, index) => {
      entry[header] = cols[index] ?? ''
    })

    return entry
  })
}

async function main() {
  const inputPath = process.argv[2] || DEFAULT_INPUT
  const outputPath = process.argv[3] || DEFAULT_OUTPUT

  const raw = await readFile(inputPath, 'utf-8')
  const rows = normalizeRows(raw.split(/\r?\n/))

  const taxonomy = rows.map((row) => {
    const categoryInfo = toCategory(row['움직임 분류'])

    return {
      category: categoryInfo.category,
      label: categoryInfo.label,
      aliases: categoryInfo.aliases,
      skills: splitSmart(row['하위 기술 및 예시']).map(parseSkill),
      movementElements: splitSmart(row['움직임 요소 (표현 요소)']),
      curriculumLink: String(row['2022 개정 교육과정 연관성 (Inferred)'] ?? '').trim(),
      gradeFocus: parseGradeFocus(row['학년군별 중점 활동']),
      source: String(row['출처'] ?? '').trim(),
    }
  })

  const output = {
    generatedAt: new Date().toISOString(),
    sourceFile: inputPath,
    taxonomy,
  }

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8')

  console.log(`Converted ${taxonomy.length} rows -> ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
