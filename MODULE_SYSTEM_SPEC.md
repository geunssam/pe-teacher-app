# 모듈식 체육 활동 시스템 - 구현 명세서

## 1. 개요

### 핵심 아이디어
체육 활동을 **3개 독립 모듈(구조 × 기술 × 변형)**로 분해하여,
종목이 달라도 같은 활동 구조를 재사용할 수 있는 시스템.

```
활동 = 구조모듈(A) × 기술모듈(B) × 변형모듈(C, 선택)

예시:
  대장활동(A) × 발패스(B)              = "축구 대장패스"
  대장활동(A) × 체스트패스(B)           = "농구 대장패스"
  대장활동(A) × 체스트패스(B) × 스피드(C) = "농구 대장패스 스피드게임"
  얼음땡(A)  × 발드리블(B) × 스쿼트(C)  = "축구 얼음땡 드리블 + 스쿼트벌칙"
```

### 교육적 원리
- 교육과정의 **FMS(기본운동기술)**가 종목기술의 기초
- 같은 FMS 그룹("던지기+받기")에 속하는 종목(농구, 피구, 빅발리볼)끼리는 활동 구조가 호환됨
- **구조**는 종목에 종속되지 않음. **기술**만 교체하면 다른 종목으로 이식 가능

### 차시 구성 패턴
교사가 1차시 또는 N차시(3차시, 5차시 등)를 선택하면,
**기본 → 응용 → 챌린지(미니게임)** 패턴으로 차시를 배치한다.

```
1차시 구성:  [기본+응용+챌린지 압축] (한 차시 안에서 도입→전개→정리)
3차시 구성:  [기본] → [응용] → [챌린지]
5차시 구성:  [기본1] → [기본2] → [응용1] → [응용2] → [챌린지]
```

차시 내부도 동일한 패턴:
```
초등 40분 / 중등 45분 / 고등 50분
┌───────┬─────────────────┬───────┐
│도입    │      전개        │정리    │
│7분     │ 28분 (초등)      │5분     │
└───────┴─────────────────┴───────┘
```

---

## 2. 모듈 3계층 구조

### A. 구조 모듈 (Structure)
- 활동의 **뼈대** (종목에 종속되지 않음)
- "어떤 방식으로 활동하는가"를 정의
- `[슬롯]` 표기로 종목별 기술이 들어갈 빈칸을 남김
- 예: 대장활동, 얼음땡, 릴레이, 짝활동, 사각패스, 폭탄돌리기 등

**핵심 필드:**
- `flow[]`: 진행 방법 (순서대로, [슬롯] 포함)
- `slots{}`: 슬롯 이름 → 설명 매핑
- `compatibleFmsCategories[]`: "이동", "비이동", "조작" 중 호환 카테고리
- `space[]`: "교실", "체육관", "운동장"
- `suitablePhase`: "기본", "응용", "챌린지"

### B. 기술 모듈 (Skill)
- **FMS + 종목기술** (종목에 종속됨)
- "무엇을 하는가"를 정의
- 구조 모듈의 슬롯에 들어갈 구체적 동작을 매핑

**핵심 필드:**
- `sport`: 소속 종목
- `fms[]`: 기반 FMS ("공차기", "던지기" 등)
- `slotMapping{}`: 각 슬롯에 들어갈 구체적 동작 텍스트
- `equipment[]`: 필요 장비

**슬롯 매핑 예시:**
```json
{
  "기술동작": "인사이드 패스",
  "기술동작-응답": "트래핑 후 패스",
  "이동동작": null,
  "공격동작": "패스로 전진",
  "수비동작": null,
  "벌칙동작": null
}
```

### C. 변형 모듈 (Modifier)
- 규칙 변형/미션 추가 (선택적)
- "어떻게 변형하는가"를 정의
- 난이도/시간에 영향을 줌

**핵심 필드:**
- `ruleOverride`: 변경되는 규칙 텍스트
- `slotOverride{}`: 특정 슬롯을 강제로 덮어씌움 (예: 벌칙동작→"스쿼트 3회")
- `suitablePhase`: 어느 차시 단계에 적합한지
- `incompatibleWith[]`: 함께 사용할 수 없는 변형 ID 목록

---

## 3. 모듈 컴파일 로직

구조 모듈의 `flow` 안에 있는 `[슬롯]`을 기술/변형 모듈의 구체적 동작으로 치환하는 과정.

### 컴파일 순서
```
1. 구조 모듈의 slots 목록 추출
2. 기술 모듈의 slotMapping에서 해당 슬롯의 값 조회
3. 변형 모듈의 slotOverride가 있으면 덮어씌움
4. flow 텍스트의 [슬롯] 자리에 값을 치환
5. 장비 목록 병합 (구조 장비 + 기술 장비 + 변형 장비)
6. 난이도 계산 (기술 기본 난이도 + 변형 difficultyDelta)
```

### 컴파일 예시
```
입력:
  구조: struct_freeze_tag (얼음땡)
  기술: skill_foot_dribble (발 드리블)
  변형: mod_squat_penalty (스쿼트 벌칙)

flow 원본:
  "나머지는 [이동동작]을 하며 도망다닌다"
  "잡히면 그 자리에서 [벌칙동작]을 한다"

컴파일 후:
  "나머지는 [발 드리블로 이동]하며 도망다닌다"
  "잡히면 그 자리에서 [스쿼트 3회]를 한다"

활동 제목: "축구 얼음땡 드리블 (스쿼트 벌칙)"
```

### 호환성 검증 규칙
```
1. 구조의 compatibleFmsCategories ∩ 기술의 fmsCategory ≠ ∅
2. 구조의 slots에 대해 기술의 slotMapping에 값이 존재 (null이 아닌 슬롯 1개 이상)
3. 변형의 incompatibleWith에 다른 변형 ID가 없음
4. 공간 호환: 구조.space ∩ 기술 가능 공간 ∩ 교사 선택 공간 ≠ ∅
5. 학년 범위 호환: 기술.gradeRange에 교사 선택 학년 포함
```

---

## 4. 차시 자동 배치 로직

교사가 **차시 수**와 **조건**(종목, FMS, 학년, 공간)을 입력하면,
각 차시에 적절한 모듈 조합을 배치한다.

### 차시별 Phase 매핑
```javascript
function assignPhases(totalLessons) {
  if (totalLessons === 1) return ["기본+응용+챌린지"]
  if (totalLessons === 2) return ["기본", "챌린지"]
  if (totalLessons === 3) return ["기본", "응용", "챌린지"]
  if (totalLessons === 4) return ["기본", "기본", "응용", "챌린지"]
  if (totalLessons === 5) return ["기본", "기본", "응용", "응용", "챌린지"]
  // 6차시 이상: 기본 2 + 응용 (n-3) + 챌린지 1
}
```

### 차시별 모듈 선택 원칙
```
기본 차시:
  - 구조: suitablePhase="기본" (짝활동, 삼각패스, 왕복챌린지 등)
  - 변형: 없음 또는 suitablePhase="기본"
  - FMS 자체의 반복 연습에 초점

응용 차시:
  - 구조: suitablePhase="응용" (대장활동, 사각패스, 얼음땡 등)
  - 변형: suitablePhase="응용" (수비추가, 장애물, 방향전환 등)
  - 구조 안에서 FMS를 활용

챌린지 차시:
  - 구조: suitablePhase="챌린지" (미니게임, 릴레이, 넘버콜 등)
  - 변형: suitablePhase="챌린지" (스피드게임, 점수제, 시간제한 등)
  - 게임/경쟁 형태
```

### N차시 구성 예시 (5학년 축구 패스)
```
3차시:
  1차시 [기본]    짝활동 × 인사이드패스
  2차시 [응용]    대장활동 × 인사이드패스
  3차시 [챌린지]  대장활동 × 인사이드패스 × 스피드게임

5차시:
  1차시 [기본]    짝활동 × 인사이드패스
  2차시 [기본]    삼각패스 × 인사이드패스
  3차시 [응용]    대장활동 × 인사이드패스
  4차시 [응용]    대장활동 × 인사이드패스 × 수비추가
  5차시 [챌린지]  미니게임 × 인사이드패스 × 스피드게임
```

---

## 5. 교실 수업 지원

### 공간 타입
- `운동장`: 넓은 공간, 제약 없음
- `체육관`: 중간 공간, 실내
- `교실`: 좁은 공간, 책상/의자 있음

### 교실 호환 모듈
```
교실 가능 구조: 짝활동, 삼각패스, 왕복챌린지, 폭탄돌리기, 스테이션순환, 넘버콜
교실 가능 변형: 스쿼트벌칙, 점수제, 시간제한, 방향전환, 색깔신호, 앉아서활동, 음악정지
교실 가능 기술: 앉아서 공 전달, 줄넘기, 사이드스텝, 스쿼트, 점핑잭, 체스트패스(좁은거리)
```

교사가 공간="교실"을 선택하면, space에 "교실"이 포함된 모듈만 필터링.

---

## 6. 현재 코드 상태 (리팩터링 대상)

### 기존 파일 구조
```
src/
├── data/
│   ├── activities.json          ← 레거시 활동 20개 (fallback용)
│   ├── activityAtoms.json       ← 기존 atom 10개 (교체 대상)
│   ├── ruleModifiers.json       ← 기존 modifier 18개 (교체 대상)
│   ├── sportCoreRules.json      ← 기존 종목 규칙 4개 (sports.json으로 대체)
│   ├── fmsTaxonomy.json         ← 기존 FMS 분류 (fmsCurriculum.json으로 대체)
│   └── modules/                 ← ★ 새로 추가된 모듈 데이터
│       ├── structures.json      ← 구조 모듈 11개
│       ├── skills.json          ← 기술 모듈 20개
│       ├── modifiers.json       ← 변형 모듈 12개
│       ├── sports.json          ← 종목 정보 9개
│       └── fmsCurriculum.json   ← FMS 교육과정
├── utils/recommend/
│   ├── generateCandidates.js    ← 498줄 (리팩터링 대상)
│   ├── scoreCandidate.js        ← 94줄 (리팩터링 대상)
│   ├── validateCandidate.js     ← 194줄 (리팩터링 대상)
│   └── renderTemplate.js        ← 44줄 (리팩터링 대상)
├── hooks/
│   └── useRecommend.js          ← 283줄 (리팩터링 대상)
├── components/sketch/
│   ├── FilterPanel.jsx          ← 269줄 (UI 변경 필요)
│   ├── ResultCard.jsx           ← 159줄 (출력 형식 변경 필요)
│   ├── VideoSection.jsx         ← 60줄
│   └── LessonMemo.jsx           ← 18줄
└── pages/
    └── SketchPage.jsx           ← 565줄 (워크플로우 변경 필요)
```

### 기존 시스템 vs 새 시스템
```
[기존] atom 10개 × modifier 18개 → 랜덤 조합 140회 시도 → 검증 → 점수 → 상위 3개
[새로] structure 11 × skill 20 × modifier 12 → 호환성 필터 → 모듈 컴파일 → 차시 배치
```

| 항목 | 기존 | 새 시스템 |
|------|------|----------|
| 데이터 | atom(종목 종속) | structure(종목 무관) + skill(종목 종속) |
| 조합 | 랜덤 뽑기 140회 | 호환성 기반 필터링 + 컴파일 |
| 종목 전환 | 불가능 | 기술 모듈만 교체하면 가능 |
| 차시 | 1차시만 생성 | N차시 단원 구성 가능 |
| 공간 | 실내/실외 | 교실/체육관/운동장 3분류 |
| 결과물 | 활동 카드 1개 | 차시별 수업 계획서 |

---

## 7. 구현 작업 목록

### Phase 1: 모듈 컴파일 엔진 (generateCandidates.js 리팩터링)

**새로 구현할 함수들:**

```javascript
// 1. 호환 모듈 필터링
filterCompatibleModules(request) → { structures[], skills[], modifiers[] }
  - request: { grade, sport, fms[], space, duration }
  - 학년/종목/FMS/공간 조건으로 필터링
  - 구조.compatibleFmsCategories ↔ 기술.fmsCategory 호환성 체크

// 2. 모듈 컴파일 (슬롯 치환)
compileActivity(structure, skill, modifier?) → CompiledActivity
  - flow의 [슬롯]을 skill.slotMapping + modifier.slotOverride로 치환
  - 제목 생성: "{종목} {구조이름} ({변형이름})"
  - 장비/난이도/시간 병합

// 3. 차시 배치
generateLessonPlan(compiledActivities, totalLessons, schoolLevel) → LessonPlan
  - totalLessons에 따라 phase 배정 (기본→응용→챌린지)
  - 각 차시에 phase에 맞는 활동 배치
  - schoolLevel에 따라 시간 배분 (초등40/중등45/고등50)

// 4. 후보 생성 (메인 함수)
generateModularCandidates(request) → Candidate[]
  - filterCompatibleModules로 풀 구성
  - 호환 조합 생성
  - compileActivity로 컴파일
  - 점수 매기기 + 상위 3개 반환
```

### Phase 2: UI 업데이트

**FilterPanel.jsx 변경사항:**
- 차시 수 선택 추가 (1, 2, 3, 4, 5차시)
- 학교급 선택 추가 (초등/중등/고등) → 시간 자동 설정
- 공간 옵션: "실내/실외" → "교실/체육관/운동장"
- 종목 목록 확장: 4개 → 9개 (티볼, 발야구, 빅발리볼, 플라잉디스크, 줄넘기 추가)

**ResultCard.jsx 변경사항:**
- 단일 활동 카드 → 차시별 수업 계획 표시
- 모듈 출처 표시 (어떤 구조+기술+변형 조합인지)
- "이 활동을 다른 종목으로" 전환 버튼
- 각 차시의 도입/전개/정리 표시

**SketchPage.jsx 변경사항:**
- Step 2: 차시별 계획을 카드 형태로 표시
- Step 3: 전체 단원 계획을 확정/저장
- 종목 전환 기능 (같은 구조를 다른 종목으로 바꾸기)

### Phase 3: Firebase Genkit RAG (향후)

현재 Phase 1-2는 **로컬 JSON + 규칙 기반**으로 구현.
Phase 3에서 Genkit RAG를 도입하면:

```
[로컬 규칙 기반]                    [Genkit RAG]
호환성 필터 (코드)          →     벡터 검색 (의미 기반)
랜덤 조합                  →     유사도 기반 추천
템플릿 컴파일              →     LLM이 컴파일 + 수업 설계
정해진 활동 데이터만 사용    →     자연어 입력으로 새 조합 발견
```

**Genkit 구현 시 아키텍처:**
```
Firestore에 모듈 데이터 + embedding 필드 저장
  → defineFirestoreRetriever로 구조/기술/변형 각각 retriever 생성
  → 교사 질의를 벡터로 변환 → 유사 모듈 검색
  → 호환성 필터링
  → Gemini Flash로 모듈 컴파일 + 차시 구성
  → Cloud Function (onCallGenkit)으로 배포
```

---

## 8. 데이터 파일 상세

### 새 모듈 데이터 위치
```
src/data/modules/
├── structures.json      구조 모듈 11개
├── skills.json          기술 모듈 20개
├── modifiers.json       변형 모듈 12개
├── sports.json          종목 정보 9개
└── fmsCurriculum.json   FMS 교육과정 (학년별)
```

### 주요 스키마 요약

**구조 모듈 핵심 필드:**
```
id, name, description, groupSize, space[],
flow[] (진행방법, [슬롯] 포함),
slots{} (슬롯이름→설명),
compatibleFmsCategories[],
interactionType, suitablePhase, teachingTips[]
```

**기술 모듈 핵심 필드:**
```
id, name, sport, fms[], fmsCategory, gradeRange[],
coreAction, responseAction, moveAction, attackAction, defenseAction,
slotMapping{} (슬롯이름→구체적 동작 텍스트),
equipment[], spaceNeeded
```

**변형 모듈 핵심 필드:**
```
id, name, description,
ruleOverride (변경 규칙 텍스트),
slotOverride{} (슬롯 강제 치환),
timeDelta, difficultyDelta, suitablePhase,
incompatibleWith[], space[]
```

---

## 9. 종목 간 활동 이식 예시

### 같은 구조, 다른 기술
```
"대장활동" 구조를 4개 종목으로 이식:

축구: 대장활동 × 인사이드패스
  → "1번이 대장 지역에 선다"
  → "2,3,4번이 순서대로 대장에게 [인사이드 패스]를 한다"
  → "대장이 [트래핑 후 인사이드 패스]로 돌려준다"

농구: 대장활동 × 체스트패스
  → "1번이 대장 지역에 선다"
  → "2,3,4번이 순서대로 대장에게 [체스트 패스]를 한다"
  → "대장이 [캐치 후 체스트 패스]로 돌려준다"

피구: 대장활동 × 언더핸드던지기
  → "1번이 대장 지역에 선다"
  → "2,3,4번이 순서대로 대장에게 [언더핸드 던지기]를 한다"
  → "대장이 [캐치 후 던지기]로 돌려준다"

플라잉디스크: 대장활동 × 백핸드스로우
  → "1번이 대장 지역에 선다"
  → "2,3,4번이 순서대로 대장에게 [백핸드 스로우]를 한다"
  → "대장이 [캐치 후 스로우]로 돌려준다"
```

### FMS 기반 이식 판별
```
"던지기+받기" FMS 그룹:
  → 농구(체스트패스), 피구(던지기), 빅발리볼(캐치앤드로우), 플라잉디스크(백핸드)
  → 이 종목들 사이에서 대장활동, 삼각패스, 사각패스 등이 모두 호환

"공차기" FMS 그룹:
  → 축구(인사이드패스), 발야구(킥)
  → 이 종목들 사이에서 호환
```

---

## 10. 참고: 기존 코드에서 유지할 것 / 교체할 것

### 유지
- `SketchPage.jsx`의 3단계 워크플로우 패턴 (조건설정 → 후보확인 → 확정)
- `ResultCard.jsx`의 글래스 카드 UI 스타일
- `useRecommend.js`의 상태 관리 패턴 (필터 상태 + 결과 상태)
- `scoreCandidate.js`의 5가지 점수 체계 개념 (FMS/전략/운영/참신/중복)
- `activities.json`은 fallback으로 유지

### 교체
- `activityAtoms.json` → `modules/structures.json` + `modules/skills.json`
- `ruleModifiers.json` → `modules/modifiers.json`
- `sportCoreRules.json` → `modules/sports.json`
- `fmsTaxonomy.json` → `modules/fmsCurriculum.json`
- `generateCandidates.js`의 랜덤 조합 로직 → 모듈 컴파일 로직
- `validateCandidate.js` → 모듈 호환성 검증으로 교체
- `renderTemplate.js` → 차시별 수업 계획 렌더링으로 교체

### 새로 추가
- 모듈 컴파일 함수 (`compileActivity`)
- 차시 배치 함수 (`generateLessonPlan`)
- 종목 전환 함수 (`transferToSport`)
- 차시 수 선택 UI
- 학교급 선택 UI (초/중/고)
- 공간 3분류 UI (교실/체육관/운동장)
