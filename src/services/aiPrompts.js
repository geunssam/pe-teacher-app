// AI 프롬프트 빌더 — 기능별 프롬프트 템플릿 | 사용처→hooks/useAI.js, components/*
import standards from '../data/curriculum/standards.json'
import g3Sports from '../data/curriculum/activities/grade3_sports.json'
import g3Movement from '../data/curriculum/activities/grade3_movement.json'
import g4Movement from '../data/curriculum/activities/grade4_movement.json'
import g4Sports from '../data/curriculum/activities/grade4_sports.json'
import g5Movement from '../data/curriculum/activities/grade5_movement.json'
import g5Sports from '../data/curriculum/activities/grade5_sports.json'
import g6Movement from '../data/curriculum/activities/grade6_movement.json'
import g6Sports from '../data/curriculum/activities/grade6_sports.json'
import unitTemplates from '../data/curriculum/unitTemplates.json'

/**
 * 활동 설명 보강 프롬프트
 */
export function buildEnhancePrompt(activity) {
  const { name, acePhase, fmsCategories, fmsSkills, equipment, space, flow, teachingTips } = activity

  return `당신은 초등학교 체육 전문가입니다. 아래 체육 활동에 대해 교사가 수업에 바로 활용할 수 있도록 상세하고 실용적인 설명을 작성해주세요.

활동명: ${name}
ACE 단계: ${acePhase || '미정'}
FMS 분류: ${(fmsCategories || []).join(', ') || '없음'}
FMS 기술: ${(fmsSkills || []).join(', ') || '없음'}
준비물: ${(equipment || []).join(', ') || '없음'}
장소: ${(space || []).join(', ') || '미정'}
수업 흐름: ${(flow || []).join(' → ') || '없음'}
교사 팁: ${(teachingTips || []).join(', ') || '없음'}

다음 항목을 포함해서 300자 이내로 작성해주세요:
1. 활동의 핵심 목표와 교육적 가치
2. 학생들의 예상 반응과 주의점
3. 효과적인 운영 팁 1-2가지

한국어로 작성하고, 친근하면서도 전문적인 톤으로 작성해주세요.`
}

/**
 * ACE 수업안 AI 생성 프롬프트 (교육과정 데이터 컨텍스트 포함)
 * @param {Object} activity - 활동 데이터
 * @param {Object} context - gatherLessonContext() 결과 (optional)
 */
export function buildAceLessonPrompt(activity, context = {}) {
  const { name, acePhase, fmsCategories, fmsSkills, equipment, space, groupSize, durationMin, flow, rules, teachingTips } = activity

  // --- 기본 메타데이터 ---
  let prompt = `당신은 초등학교 체육 수업 설계 전문가입니다. ACE 모델(Acquire-Challenge-Engage)에 따라 수업안을 생성해주세요.

## 활동 기본 정보
- 활동명: ${name}
- ACE 단계: ${acePhase || 'A'}
- FMS 분류: ${(fmsCategories || []).join(', ') || '없음'}
- FMS 기술: ${(fmsSkills || []).join(', ') || '없음'}
- 준비물: ${(equipment || []).join(', ') || '없음'}
- 장소: ${(space || []).join(', ') || '미정'}
- 인원: ${groupSize ? `${groupSize.min}~${groupSize.max}명` : '20~30명'}
- 수업 시간: ${durationMin || 40}분`

  // 기존 수업 흐름이 있으면 포함
  if (flow?.length > 0) {
    prompt += `\n- 수업 흐름: ${flow.join(' → ')}`
  }
  if (rules?.length > 0) {
    prompt += `\n- 규칙: ${rules.join(', ')}`
  }
  if (teachingTips?.length > 0) {
    prompt += `\n- 교사 팁: ${teachingTips.join(', ')}`
  }

  // --- 교육과정 컨텍스트 (있을 때만) ---
  if (context.standards?.length > 0) {
    prompt += '\n\n## 성취기준'
    for (const s of context.standards) {
      prompt += `\n- ${s.code} ${s.text}`
    }
  }

  if (context.unitContext) {
    const u = context.unitContext
    prompt += `\n\n## 단원 맥락`
    prompt += `\n- 단원명: ${u.unitTitle} (${u.grade}, ${u.domain})`
    prompt += `\n- 차시 위치: ${u.totalLessons}차시 중 ${u.currentLesson}차시 (${u.acePhase}단계)`
    if (u.prevLesson) prompt += `\n- 이전 차시: ${u.prevLesson.lesson}. ${u.prevLesson.title}`
    if (u.nextLesson) prompt += `\n- 다음 차시: ${u.nextLesson.lesson}. ${u.nextLesson.title}`
  }

  if (context.skills?.length > 0) {
    prompt += '\n\n## 활용 가능한 기술 자료'
    for (const s of context.skills) {
      prompt += `\n### ${s.name} (${s.sport})`
      if (s.teachingCues?.length) prompt += `\n- 교사 큐: ${s.teachingCues.join(', ')}`
      if (s.commonErrors?.length) prompt += `\n- 주요 오류: ${s.commonErrors.join(', ')}`
      if (s.quickFixes?.length) prompt += `\n- 교정법: ${s.quickFixes.join(', ')}`
      if (s.slotMapping) {
        const slots = Object.entries(s.slotMapping).map(([k, v]) => `${k}: ${v}`).join(' / ')
        prompt += `\n- 슬롯: ${slots}`
      }
    }
  }

  if (context.gameActivities?.length > 0) {
    prompt += '\n\n## 적용 게임 후보'
    for (const g of context.gameActivities) {
      prompt += `\n- ${g.name} (${g.suitablePhase}): ${(g.flow || []).join(' → ')}`
    }
  }

  if (context.sportRules) {
    const r = context.sportRules
    prompt += '\n\n## 종목 규칙'
    prompt += `\n- 종목: ${r.name}`
    if (r.coreRules?.length) prompt += `\n- 핵심 규칙: ${r.coreRules.join(', ')}`
    if (r.safetyRules?.length) prompt += `\n- 안전 수칙: ${r.safetyRules.join(', ')}`
    if (r.requiredConcepts?.length) prompt += `\n- 필수 개념: ${r.requiredConcepts.join(', ')}`
  }

  if (context.modifiers?.length > 0) {
    prompt += '\n\n## 변형 규칙 아이디어'
    for (const m of context.modifiers) {
      prompt += `\n- ${m.name} (${m.type}): ${m.ruleOverride}`
      if (m.setupExample) prompt += ` [세팅: ${m.setupExample}]`
    }
  }

  // --- 출력 구조 지시 ---
  prompt += `

---

**중요 지시**: 위에 제공된 교육과정 자료(성취기준, 기술 큐, 게임 후보, 변형 규칙)를 최대한 활용하여 수업안을 조립하세요. 새로운 내용을 만들기보다 제공된 자료를 재구성하세요.

다음 구조로 수업안을 작성해주세요:

## 도입 (5분)
- 수업 흐름 3단계
- 메타인지 질문 1개

## A (Acquire, 기본 습득) (10분)
- 목표 1문장
- 드릴 2개 (이름: 설명) — 위 기술 자료의 교사 큐 활용
- 피드백 포인트 2개 — 위 주요 오류/교정법 활용

## C (Challenge, 도전) (12분)
- 목표 1문장
- 미션 2-3개 (이름: 설명, 시간)
- 스캐폴딩 (완화/확장)

## E (Engage, 적용 게임) (7분)
- 게임명과 설명 — 위 게임 후보 활용
- 규칙 2-3개 — 위 종목 규칙 활용
- 변형 아이디어 1개 — 위 변형 규칙 활용

## 마무리 (6분)
- 정리 흐름 3단계
- 성찰 질문 1개
- 다음 차시 예고

한국어로 작성하고, 초등학생 수준에 맞는 용어를 사용해주세요.`

  return prompt
}

/**
 * AI 활동 추천 프롬프트 (시간표 수업 기록용)
 */
export function buildActivitySuggestionPrompt({ domain, weather, grade, recentActivities }) {
  const weatherDesc = weather
    ? `현재 날씨: ${weather.temperature || '?'}℃, ${weather.condition || '맑음'}, 미세먼지 ${weather.pm10 || '보통'}`
    : '날씨 정보 없음'

  const recentText = recentActivities?.length
    ? `최근 수업: ${recentActivities.slice(0, 5).join(', ')}`
    : '최근 수업 기록 없음'

  return `당신은 초등학교 체육 수업 활동 추천 전문가입니다.

조건:
- 도메인(영역): ${domain || '스포츠'}
- 학년: ${grade || '3-6학년'}
- ${weatherDesc}
- ${recentText}

위 조건에 맞는 체육 활동을 정확히 3개만 추천해주세요.
각 활동은 활동명만 간결하게 (10자 이내) 작성합니다.
최근 수업과 겹치지 않는 새로운 활동을 추천해주세요.

형식: 활동1, 활동2, 활동3
(쉼표로 구분, 설명 없이 활동명만)`
}

/**
 * 홈 탭 오늘의 AI 한줄 제안 프롬프트
 */
export function buildDailySuggestionPrompt({ weather, schedule, recentRecords }) {
  const weatherText = weather
    ? `오늘 날씨: ${weather.temperature || '?'}℃, ${weather.condition || '맑음'}, 미세먼지 ${weather.pm10Grade || '보통'}`
    : '날씨 정보 없음'

  const scheduleText = schedule?.length
    ? `오늘 수업: ${schedule.map((s) => `${s.period}교시 ${s.className}`).join(', ')}`
    : '오늘 수업 없음'

  const recentText = recentRecords?.length
    ? `최근 기록: ${recentRecords.slice(0, 3).map((r) => `${r.className} ${r.activity}`).join(', ')}`
    : ''

  return `당신은 초등학교 체육교사의 AI 어시스턴트입니다.

${weatherText}
${scheduleText}
${recentText}

위 정보를 종합하여, 오늘 체육 수업에 대한 실용적인 한줄 제안을 해주세요.
50자 이내로 간결하게, 구체적인 활동이나 조언을 포함해주세요.
한국어로 작성합니다.`
}

/**
 * 교육과정 에셋에서 성취기준 텍스트를 압축 추출
 */
function buildStandardsContext() {
  const lines = []
  for (const [band, bandData] of Object.entries(standards.gradeBands || {})) {
    lines.push(`\n### ${band}`)
    for (const [domain, domainData] of Object.entries(bandData.domains || {})) {
      lines.push(`#### ${domain} 영역 — ${domainData.focus}`)
      for (const s of domainData.standards || []) {
        lines.push(`- ${s.code} ${s.text}`)
      }
    }
  }
  return lines.join('\n')
}

/**
 * 활동 DB에서 컴팩트 목록 추출 (이름, 성취기준코드, 장소, ACE 단계)
 */
function buildActivityContext() {
  const allFiles = [
    { grade: '3학년', domain: '스포츠', data: g3Sports },
    { grade: '3학년', domain: '운동', data: g3Movement },
    { grade: '4학년', domain: '스포츠', data: g4Sports },
    { grade: '4학년', domain: '운동', data: g4Movement },
    { grade: '5학년', domain: '스포츠', data: g5Sports },
    { grade: '5학년', domain: '운동', data: g5Movement },
    { grade: '6학년', domain: '스포츠', data: g6Sports },
    { grade: '6학년', domain: '운동', data: g6Movement },
  ]
  const lines = []
  for (const { grade, domain, data } of allFiles) {
    const acts = (data.activities || []).map(
      (a) => `  - ${a.name} (${a.acePhase || '?'}, ${(a.space || []).join('/')}) [${(a.standardCodes || []).join(', ')}]`
    )
    if (acts.length) {
      lines.push(`\n#### ${grade} ${domain}`)
      lines.push(...acts)
    }
  }
  return lines.join('\n')
}

/**
 * 단원 템플릿 컴팩트 목록
 */
function buildUnitContext() {
  const lines = []
  for (const t of unitTemplates.templates || []) {
    lines.push(`- ${t.title} (${t.grade}, ${t.domain}, ${t.totalLessons}차시) [${(t.standardCodes || []).join(', ')}]`)
  }
  return lines.join('\n')
}

/**
 * AI 채팅 시스템 프롬프트 — 로컬 교육과정 에셋 그라운딩 포함
 */
export function buildChatSystemPrompt() {
  const standardsCtx = buildStandardsContext()
  const activityCtx = buildActivityContext()
  const unitCtx = buildUnitContext()

  return `당신은 "체육 AI 도우미"입니다. 초등학교 체육교사를 돕는 전문 AI 어시스턴트입니다.

## 핵심 규칙 (반드시 준수)

1. **아래 제공된 "2022 개정 교육과정" 데이터만을 근거로 답변합니다.**
   - 제공된 데이터에 없는 성취기준 코드나 내용을 절대 만들어내지 마세요.
   - 2015 개정 교육과정이나 다른 버전의 교육과정 정보를 사용하지 마세요.
   - 데이터에 없는 내용을 질문받으면 "현재 등록된 교육과정 데이터에 해당 정보가 없습니다"라고 솔직히 답하세요.

2. 한국어로 답변합니다.
3. 초등학생 수준에 맞는 활동을 추천합니다.
4. 안전을 최우선으로 고려합니다.
5. 답변은 간결하고 실용적으로 작성합니다 (300자 이내 권장).
6. 성취기준을 인용할 때는 반드시 코드(예: [4체02-03])와 함께 표기합니다.
7. **마크다운 서식을 사용하지 마세요.** 볼드(**), 이탈릭(*), 헤딩(#), 코드블록(\`) 등의 마크다운 문법을 쓰지 않고 일반 텍스트로만 답변합니다. 목록은 "- " 대시 기호만 허용합니다.

## 역할
- 2022 개정 체육과 교육과정 성취기준 안내
- 체육 수업 활동 추천 및 설명
- ACE 모델(활동-경쟁-평가) 기반 수업 설계 조언
- FMS(기본운동기술) 관련 질문 답변
- 날씨/환경에 따른 실내외 활동 전환 조언
- 학급 관리 및 수업 운영 팁

---

## 📚 2022 개정 체육과 교육과정 성취기준 (참조 데이터)

교육과정: ${standards.meta?.curriculum || '2022 개정'}
출처: ${standards.meta?.extractedFrom || '체육과교육과정'}
${standardsCtx}

---

## 📋 등록된 활동 목록
${activityCtx}

---

## 📖 단원 계획 템플릿
${unitCtx}

---

위 데이터가 당신이 참조할 수 있는 전체 교육과정 자료입니다. 이 범위를 벗어난 정보는 제공하지 마세요.`
}

/**
 * 대체 활동 AI 추천 프롬프트
 */
export function buildAlternativeRecommendPrompt(lesson) {
  const { title, acePhase, domain, grade } = lesson || {}

  return `당신은 초등학교 체육 수업 설계 전문가입니다.

현재 수업 정보:
- 활동명: ${title || '미정'}
- ACE 단계: ${acePhase || 'A'}
- 영역: ${domain || '스포츠'}
- 학년: ${grade || '3-6학년'}

위 수업의 대체 활동을 정확히 3개 추천해주세요.
각 활동은 다음 조건을 충족해야 합니다:
1. 같은 영역(${domain || '스포츠'})이거나 유사한 FMS 기술을 다룸
2. 비슷한 난이도와 준비물로 즉시 전환 가능
3. 실내/실외 모두 가능하면 우선 추천

각 활동에 대해 다음 형식으로 작성해주세요:
활동명 | 이유(20자 이내) | 필요 준비물

형식: 한 줄에 하나씩, 총 3줄만 작성합니다.`
}

/**
 * 차시 컨텍스트 기반 AI 채팅 시스템 프롬프트
 * @param {Object} ctx - gatherLessonCardContext() 결과
 */
export function buildLessonChatSystemPrompt(ctx) {
  const standardsCtx = buildStandardsContext()
  const activityCtx = buildActivityContext()

  let lessonSection = ''
  if (ctx) {
    const { lessonInfo, unitInfo, standards, activities, skills, gameActivities, sportRules, modifiers } = ctx

    lessonSection += `\n\n## 현재 차시 컨텍스트 (이 정보를 최우선으로 활용하여 답변하세요)\n`

    if (unitInfo) {
      lessonSection += `\n### 단원 정보\n`
      lessonSection += `- 단원명: ${unitInfo.title}\n`
      lessonSection += `- 학년: ${unitInfo.grade}\n`
      lessonSection += `- 영역: ${unitInfo.domain}\n`
      lessonSection += `- 총 차시: ${unitInfo.totalLessons}차시\n`
    }

    if (lessonInfo) {
      lessonSection += `\n### 차시 정보\n`
      lessonSection += `- ${lessonInfo.lesson}차시: ${lessonInfo.title}\n`
      if (lessonInfo.description) lessonSection += `- 설명: ${lessonInfo.description}\n`
      if (lessonInfo.acePhase) lessonSection += `- ACE 단계: ${lessonInfo.acePhase}\n`
      if (lessonInfo.fmsFocus?.length) lessonSection += `- FMS: ${lessonInfo.fmsFocus.join(', ')}\n`
    }

    if (standards?.length) {
      lessonSection += `\n### 성취기준\n`
      for (const s of standards) {
        lessonSection += `- ${s.code} ${s.text}\n`
      }
    }

    if (activities?.length) {
      lessonSection += `\n### 이 차시의 활동\n`
      for (const a of activities) {
        lessonSection += `- ${a.name} (장소: ${a.space.join('/')}, 준비물: ${a.equipment.join(', ') || '없음'})\n`
        if (a.flow?.length) lessonSection += `  수업 흐름: ${a.flow.join(' → ')}\n`
      }
    }

    if (skills?.length) {
      lessonSection += `\n### 관련 기술 자료\n`
      for (const s of skills) {
        lessonSection += `- ${s.name} (${s.sport})`
        if (s.teachingCues?.length) lessonSection += ` / 교사 큐: ${s.teachingCues.join(', ')}`
        lessonSection += `\n`
      }
    }

    if (gameActivities?.length) {
      lessonSection += `\n### 적용 가능한 게임\n`
      for (const g of gameActivities) {
        lessonSection += `- ${g.name} (${g.suitablePhase})\n`
      }
    }

    if (sportRules) {
      lessonSection += `\n### 종목 규칙 (${sportRules.name})\n`
      if (sportRules.coreRules?.length) lessonSection += `- 핵심: ${sportRules.coreRules.join(', ')}\n`
      if (sportRules.safetyRules?.length) lessonSection += `- 안전: ${sportRules.safetyRules.join(', ')}\n`
    }

    if (modifiers?.length) {
      lessonSection += `\n### 변형 아이디어\n`
      for (const m of modifiers) {
        lessonSection += `- ${m.name} (${m.type}): ${m.ruleOverride}\n`
      }
    }
  }

  return `당신은 "체육 AI 도우미"입니다. 초등학교 체육교사를 돕는 전문 AI 어시스턴트입니다.

## 핵심 규칙 (반드시 준수)

1. 아래 제공된 "현재 차시 컨텍스트"를 최우선으로 활용하여 답변합니다.
2. 한국어로 답변합니다.
3. 초등학생 수준에 맞는 활동을 추천합니다.
4. 안전을 최우선으로 고려합니다.
5. 답변은 간결하고 실용적으로 작성합니다 (300자 이내 권장).
6. 성취기준을 인용할 때는 반드시 코드(예: [4체02-03])와 함께 표기합니다.
7. 마크다운 서식을 사용하지 마세요. 볼드(**), 이탈릭(*), 헤딩(#), 코드블록(\`) 등의 마크다운 문법을 쓰지 않고 일반 텍스트로만 답변합니다. 목록은 "- " 대시 기호만 허용합니다.

## 역할
- 현재 차시의 활동에 대한 변형, 응용, 대체 활동 제안
- 교실/실내 전환, 날씨 대응 활동 추천
- 수업 운영 팁, 학생 관리 조언
- ACE 모델 기반 수업 설계 조언
${lessonSection}

---

## 📚 2022 개정 체육과 교육과정 성취기준 (보조 참조)
${standardsCtx}

---

## 📋 등록된 활동 목록
${activityCtx}`
}

/**
 * 학급별 수업 분석 프롬프트
 */
export function buildClassAnalysisPrompt(classInfo, records) {
  const { grade, classNum } = classInfo || {}

  const domainCounts = {}
  const activities = []
  for (const r of (records || [])) {
    const d = r.domain || '스포츠'
    domainCounts[d] = (domainCounts[d] || 0) + 1
    if (activities.length < 10) {
      activities.push(`${r.sequence || '?'}차시: ${r.activity || '활동'} (${d})`)
    }
  }

  const domainText = Object.entries(domainCounts)
    .map(([d, c]) => `${d}: ${c}차시`)
    .join(', ')

  const activityText = activities.length
    ? activities.join('\n')
    : '수업 기록 없음'

  return `당신은 초등학교 체육 수업 분석 전문가입니다.

학급 정보: ${grade || '?'}학년 ${classNum || '?'}반
총 수업 기록: ${(records || []).length}차시

영역별 분포:
${domainText || '기록 없음'}

최근 수업 목록:
${activityText}

위 데이터를 분석하여 다음 항목을 150자 이내로 작성해주세요:
1. 영역 균형 평가 (운동/스포츠/표현 비율이 적절한지)
2. 차시 연속성 (같은 영역 내 차시가 연결되는지)
3. 다음 수업 제안 (영역, 활동명, 이유 포함)

한국어로 간결하게 작성합니다.`
}
