# 수업스케치 모듈 시스템 — 전체 로드맵

## Context

수업스케치는 이 앱의 핵심 기능이다. 이미 **6층 레이어 아키텍처**가 설계되어 있지만, 현재 엔진은 Layer 4(atoms) + Layer 5(modifiers)만 사용 중이다. **Layer 2(skills) + Layer 3(structures)의 slotMapping 연동**이 핵심 누락 부분이며, 이번 구현으로 전체 레이어를 연결한다.

궁극적으로 **Genkit RAG + LLM**으로 확장하여 자연어 추천, 개인화, 수업안 자동 생성을 구현한다.

### 6층 레이어 아키텍처

```
┌─────────────────────────────────────────────┐
│  Layer 6: 수업 생성 엔진 (generateCandidates)  │  ← 조합기 (이번에 교체)
├─────────────────────────────────────────────┤
│  Layer 5: modifiers (12개)                  │  ← 변형 규칙
├─────────────────────────────────────────────┤
│  Layer 4: activityAtoms (10개)               │  ← 전술 활동 원자 (유지, 공존)
├─────────────────────────────────────────────┤
│  Layer 3: structures (11개)                  │  ← 수업 구조 틀 [신규 생성]
├─────────────────────────────────────────────┤
│  Layer 2: skills (14개) + slotMapping        │  ← 종목별 기술 [신규 생성]
├─────────────────────────────────────────────┤
│  Layer 1: sports (4종목) + fmsCurriculum      │  ← 종목 + FMS 기초 [신규 생성]
└─────────────────────────────────────────────┘
```

**핵심 철학**: 모듈 컴파일러는 신뢰성·안전·재현성 담당 (뼈대), RAG/LLM은 지식 보강·설명 생성·개인화 담당 (살)

### 전체 로드맵 개요

| Phase | 범위 | 핵심 |
|-------|------|------|
| **1차 (이번)** | 6층 레이어 연결 | structure × skill × modifier 슬롯 컴파일 + fmsCurriculum |
| **2차** | 확장 + N차시 | 9종목, N차시 배치, 표현/생태 영역 |
| **3차** | Firebase 연동 | Auth + Firestore + 수업기록 클라우드화 |
| **4차** | Genkit RAG + LLM | 벡터 검색 + 자연어 추천 + 수업안 생성 |
| **5차** | 고도화 | PDF 자료 임베딩, 개인화, 챗봇 UI |

---

## Phase 1: 6층 레이어 연결 (이번 구현)

### 현재 → 목표 비교

| 항목 | 현재 | 목표 |
|------|------|------|
| 엔진 | atom + modifier (Layer 4+5만) | structure × skill × modifier (Layer 2~5 전체) |
| 구조 | 없음 | **11개** structures + slotMapping 연동 |
| 기술 | 없음 | **14개** skills (4종목 × 3~4개) |
| 변형 | 20개 (ruleModifiers) | **12개** modifiers (정제 마이그레이션) |
| 종목 | 4개 | 4개 유지 (9개는 Phase 2) |
| 공간 | 실내/실외 | 교실/체육관/운동장 |
| 시간 | 25~40분 슬라이더 | 30/35/40/45/50분 드롭다운 |
| 학년 | 5~6학년 | 3~6학년 |
| 시간배분 | 없음 | **fmsCurriculum** (도입 7분/전개 28분/정리 5분) |
| atoms | 사용 중 | **유지 (공존)** — fallback + Layer 4 역할 |

### Step 1: 모듈 데이터 생성 (`src/data/modules/`)

Firebase/RAG 연동을 고려한 flat 스키마. 각 모듈에 고유 ID 부여.

#### 1-1. `structures.json` — 구조 모듈 (11개)

활동의 "뼈대". `[슬롯]` 자리를 기술 모듈이 채운다. `suitablePhase`로 차시 난이도 배치.

```jsonc
{
  "structures": [{
    "id": "struct_pair_practice",
    "name": "짝활동",
    "description": "2인 1조로 마주보고 [기술동작]을 주고받는 기본 연습",
    "groupSize": "2인 1조",
    "space": ["교실", "체육관", "운동장"],
    "flow": [
      "2인 1조로 마주보고 선다 (간격 3~5m)",
      "한 학생이 [기술동작]을 상대에게 보낸다",
      "상대가 [기술동작-응답]으로 받아서 되돌려 보낸다",
      "5회 연속 성공 시 거리를 1m 늘린다"
    ],
    "slots": {
      "기술동작": "주요 기술 동작 (패스, 던지기 등)",
      "기술동작-응답": "받은 후 돌려보내는 동작"
    },
    "compatibleFmsCategories": ["조작"],
    "suitablePhase": "기본",
    "baseDurationMin": 10,
    "difficultyBase": 1,
    "equipment": ["콘"],
    "teachingTips": ["거리를 점진적으로 늘려 성공 경험 확보"]
  }]
}
```

**11개 구조** (suitablePhase별):
- **기본**: 짝활동, 폭탄돌리기, 왕복챌린지
- **응용**: 삼각패스, 사각패스, 스테이션순환, 게이트돌파
- **챌린지**: 대장활동, 얼음땡, 릴레이, 넘버콜, 미니게임

학년별 적합도:
- 3~4학년: 기본 구조 중심 (1기술 반복)
- 5~6학년: 응용 + 챌린지 (전술 조합)

#### 1-2. `skills.json` — 기술 모듈 (14개, 4종목)

```jsonc
{
  "skills": [{
    "id": "skill_soccer_inside_pass",
    "name": "인사이드 패스",
    "sport": "축구",
    "fms": ["차기", "받기"],
    "fmsCategory": "조작",
    "gradeRange": ["3학년", "4학년", "5학년", "6학년"],
    "slotMapping": {
      "기술동작": "인사이드 패스",
      "기술동작-응답": "발바닥 트래핑 후 인사이드 패스",
      "이동동작": "공을 몰며 이동",
      "공격동작": "패스로 전진",
      "수비동작": null,
      "벌칙동작": null
    },
    "equipment": ["축구공"],
    "spaceNeeded": "체육관+"
  }]
}
```

**종목별**: 축구 4, 농구 4, 피구 3, 배구 3
(Phase 2에서 5종목 추가 시 20개 → 40~50개로 확장)

#### 1-3. `modifiers.json` — 변형 모듈 (12개)

기존 `ruleModifiers.json` 20개에서 **12개로 정제**. `slotOverride`와 `space` 필드 추가.

#### 1-4. `sports.json` — 종목 정보 (4종목)

기존 `sportCoreRules.json`을 새 형식으로 이관. 키 구조만 배열로 변경.

#### 1-5. `fmsCurriculum.json` — 학년별 FMS 진행경로 + 수업 시간 배분 (신규)

```jsonc
{
  "schoolLevelDuration": {
    "초등": { "minutes": 40, "intro": 7, "main": 28, "closing": 5 }
  },
  "gradeProgression": {
    "3학년": {
      "fmsStage": "기초 습득",
      "suitableStructures": ["기본"],
      "maxModifiers": 0,
      "focus": "1기술 반복 연습"
    },
    "4학년": {
      "fmsStage": "기초 확장",
      "suitableStructures": ["기본", "응용"],
      "maxModifiers": 1,
      "focus": "2기술 연결"
    },
    "5학년": {
      "fmsStage": "응용 전이",
      "suitableStructures": ["기본", "응용", "챌린지"],
      "maxModifiers": 2,
      "focus": "전술 조합 시작"
    },
    "6학년": {
      "fmsStage": "전략 통합",
      "suitableStructures": ["응용", "챌린지"],
      "maxModifiers": 3,
      "focus": "전략형 게임"
    }
  }
}
```

엔진에서 활용:
- `schoolLevelDuration`: 수업 아웃라인의 도입/전개/정리 시간 자동 산출
- `gradeProgression.suitableStructures`: 학년에 맞는 구조만 필터
- `gradeProgression.maxModifiers`: 학년별 변형 수 제한

### Step 2: 모듈 컴파일 엔진 (`src/utils/recommend/`)

#### 2-1. `moduleCompiler.js` (신규)

```
filterCompatibleModules(request)
  → { structures[], skills[], modifiers[] }
  필터:
  - structure: space 호환, fmsCategory 매칭,
              suitablePhase ∈ gradeProgression.suitableStructures
  - skill: sport 일치, grade 포함, fmsCategory ↔ structure 호환
  - modifier: sport 허용, space 호환, forbiddenIds/Tags 체크,
              개수 ≤ gradeProgression.maxModifiers

compileActivity(structure, skill, modifiers[], curriculum)
  → CompiledActivity
  1. structure.flow의 [슬롯]을 skill.slotMapping으로 치환
  2. modifier.slotOverride 순차 덮어쓰기
  3. 제목: "{종목} {구조} {기술} ({변형})"
  4. 장비 병합, 난이도 계산, 시간 계산
  5. curriculum.schoolLevelDuration으로 도입/전개/정리 시간 산출
```

#### 2-2. `generateModularCandidates.js` (신규)

```
generateModularCandidates(request)
  1. filterCompatibleModules → 풀 구성
  2. structure × skill 호환 페어링
  3. modifier 0~2개 랜덤 부착
  4. compileActivity() → 컴파일
  5. validateCompiledCandidate() → 검증
  6. scoreCandidate() → 점수 (기존 로직 재사용)
  7. 상위 3개 반환
  * 풀 부족 시: 기존 generateCandidates() fallback
```

#### 2-3. 기존 파일 유지 (fallback)

`generateCandidates.js`, `validateCandidate.js`, `scoreCandidate.js` 삭제 안 함.

### Step 3: useRecommend.js 업데이트

```javascript
// 변경 전 → 변경 후
LOCATIONS = ['실내', '실외']      → SPACES = ['운동장', '체육관', '교실']
GRADES = ['5학년', '6학년']       → GRADES = ['3학년', '4학년', '5학년', '6학년']
selectedLocation / weatherFilter  → selectedSpace (weatherFilter 제거)

// 추천 함수: 1차 시도 generateModularCandidates, 실패 시 기존 fallback
```

### Step 4: FilterPanel.jsx UI 변경

```
┌─────────────────────┬──────────────────────┐
│ 좌상: 학년(4버튼) +   │ 우상: 장소 <select>   │
│       종목(4버튼)     │       시간 <select>   │
│                     │       교구 텍스트      │
├─────────────────────┼──────────────────────┤
│ 좌하: FMS (유지)      │ 우하: 종목기술 (유지)   │
└─────────────────────┴──────────────────────┘
```

- 장소: `<select>` (운동장/체육관/교실)
- 시간: `<select>` (30/35/40/45/50분, 기본 40)
- 실내 우선 체크박스 제거

### 수정 파일 목록

| 파일 | 변경 | 내용 |
|------|------|------|
| `src/data/modules/structures.json` | 신규 | 구조 **11개** |
| `src/data/modules/skills.json` | 신규 | 기술 **14개** (4종목) |
| `src/data/modules/modifiers.json` | 신규 | 변형 **12개** (정제) |
| `src/data/modules/sports.json` | 신규 | 종목 4개 |
| `src/data/modules/fmsCurriculum.json` | 신규 | **학년별 FMS 경로 + 시간 배분** |
| `src/utils/recommend/moduleCompiler.js` | 신규 | 컴파일 엔진 |
| `src/utils/recommend/generateModularCandidates.js` | 신규 | 후보 생성 |
| `src/hooks/useRecommend.js` | 수정 | 상수/상태/엔진 교체 |
| `src/components/sketch/FilterPanel.jsx` | 수정 | UI 변경 |
| `src/pages/SketchPage.jsx` | 수정 | prop 변경 반영 |

기존 파일 유지 (fallback + Layer 4 공존):
- `src/data/activityAtoms.json` (전술 활동 원자 10개)
- `src/data/ruleModifiers.json` (기존 변형 20개)
- `src/data/sportCoreRules.json` (기존 종목 규칙)
- `src/utils/recommend/generateCandidates.js` (기존 엔진)

---

## Phase 2: 확장 + N차시 배치 (2차)

### 핵심 추가

| 항목 | Phase 1 | Phase 2 |
|------|---------|---------|
| 종목 | 4개 | 9개 (+티볼, 발야구, 빅발리볼, 플라잉디스크, 줄넘기) |
| 영역 | 스포츠(전략형) | + 표현, 생태/건강 |
| 차시 | 1차시 단독 | N차시 배치 (1~5차시 시퀀스) |
| 구조 | 11개 | 15~20개 |
| 기술 | 14개 (4종목) | 40~50개 (9종목) |

### N차시 배치 설계

```
차시 시퀀스 (fmsCurriculum.gradeProgression.suitableStructures 기반):
  1차시: 기본기 연습 (짝활동, 구조=기본)
  2차시: 응용 (삼각/사각패스, 구조=응용)
  3차시: 게임형 (대장활동/얼음땡, 구조=챌린지)
  4차시: 전략 (미니게임 + modifier 복합)
  5차시: 통합/평가 (리그전, 자유 게임)
```

- `lessonSequencer.js`: 차시별 구조 난이도 자동 배치
- UI에 "N차시 묶음 생성" 버튼 추가

---

## Phase 3: Firebase 연동

### 핵심 작업

```
localStorage → Firestore 마이그레이션

pe_class_setup    → /users/{uid}/config
pe_classes        → /users/{uid}/classes/{classId}
pe_rosters        → /users/{uid}/classes/{classId}/roster
pe_class_records  → /users/{uid}/classes/{classId}/records  ← Phase 4 RAG 학습 데이터
pe_timetable_*    → /users/{uid}/schedule/
pe-teacher-settings → /users/{uid}/settings
```

### 정형 데이터 → Firestore 컬렉션

**모듈 데이터** (현재 JSON → Firestore):
```
/modules/
  ├── structures/{id}     ← 구조 모듈 (짝활동, 대장활동 등)
  ├── skills/{id}         ← 기술 모듈 (인사이드 패스 등)
  ├── modifiers/{id}      ← 변형 모듈 (스쿼트 벌칙 등)
  └── sports/{id}         ← 종목 정보 (축구, 농구 등)
```

**FMS 분류 체계** (현재 fmsTaxonomy.json → Firestore):
```
/taxonomy/
  └── fms/{category}      ← 이동/비이동/조작 + 하위 스킬 목록
```

**FMS 커리큘럼** (현재 fmsCurriculum.json → Firestore):
```
/taxonomy/
  └── curriculum          ← 학년별 FMS 경로 + 시간 배분
```

장점:
- 모듈 추가/수정 시 앱 재배포 불필요
- Phase 4에서 벡터 임베딩 필드(embedding) 추가 용이
- 교사 커뮤니티가 모듈을 공유/기여 가능 (미래)

### 비정형 지식 → Firestore + 벡터 임베딩 (Phase 4~5)

**PDF 참고 자료에서 추출한 지식 청크**:
```
/knowledge/documents/{id}
  ├── content: "대장패스는 순환형 구조로 2인 이상이..."
  ├── source: "동아출판 체육 게임 자료집 p.32"
  ├── tags: ["패스", "순환", "팀"]
  └── embedding: vector(768)
```

이것은 모듈 DB에 없는 활동도 RAG가 자료집에서 찾아 추천할 수 있게 하는 **지식 보강 레이어**.

대상 자료:
- 체육과교육과정(2022개정).pdf
- 동아출판 체육 게임 & 표현 활동 자료집
- 실내 체육 16차시 / 베스트 술래 게임 20
- 교사가 추가 업로드하는 자료

### 추가 사항
- Firebase Auth (구글 로그인)
- Firestore Security Rules (본인 데이터만 접근)
- 학생 이름 = 개인정보 → uid 기반 접근 제한

---

## Phase 4: Genkit RAG + LLM (모듈 시스템 안정화 후)

### 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 (React)                      │
│  SketchPage → useRecommend → callGenkitFlow()           │
└─────────────┬───────────────────────────────────────────┘
              │ httpsCallable / REST
              ▼
┌─────────────────────────────────────────────────────────┐
│              Cloud Functions (Genkit Flow)                │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ 1. 메타 필터   │→│ 2. 벡터 검색  │→│ 3. LLM 정제    │  │
│  │ (grade,sport, │  │ (Retriever)  │  │ (자연어 추천,   │  │
│  │  space,time)  │  │ Top-k 유사   │  │  수업안 생성)   │  │
│  └──────────────┘  │ 모듈 검색     │  └───────────────┘  │
│                    └──────────────┘                      │
│         ↕                ↕                               │
│  ┌──────────────┐  ┌──────────────┐                      │
│  │ 모듈 컴파일러  │  │ Firestore    │                      │
│  │ (Phase 1의    │  │ Vectors     │                      │
│  │  안전한 뼈대)  │  │ (임베딩 저장) │                      │
│  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

### LLM 모델 선택

사용자 선호: **Ollama (로컬) 또는 GPT-oss (오픈소스)**

```
옵션 A: Ollama + 자체 서버
  - 장점: 무료, 데이터 프라이버시, 커스텀 파인튜닝 가능
  - 단점: GPU 서버 필요 (M4 Pro 로컬도 가능하지만 배포 시 별도 서버)
  - 모델: Llama 3, Mistral, Qwen 등

옵션 B: GPT-oss (오픈소스 API 호스팅)
  - 장점: 서버 관리 불필요, API 형태로 간편
  - 단점: 비용 발생 (소규모면 저렴)

* Genkit은 커스텀 모델 플러그인을 지원하므로 Ollama/GPT-oss 모두 연결 가능
* 개발 시에는 Gemini 무료 티어로 프로토타이핑 → 배포 시 Ollama/GPT-oss 전환
```

### 3대 핵심 기능

#### 4-1. 자연어 수업 추천

```
교사 입력: "비 오는 날 3학년 실내에서 할 수 있는 활동"
    ↓
Genkit Flow:
  1. 메타 필터: grade=3, space=교실/체육관, weather=rain
  2. 벡터 검색: "비 오는 날 실내 활동" 임베딩 → 유사 모듈 Top-10
  3. 모듈 컴파일러: 호환되는 structure × skill × modifier 조합
  4. LLM 정제: 후보 3개를 자연스러운 수업 설명으로 변환
    ↓
출력: 컴파일된 활동 카드 3개 (+ 자연어 설명)
```

#### 4-2. 수업 기록 기반 개인화

```
Firestore: /users/{uid}/classes/{classId}/records
  ↓ (수업 이력 분석)
"4학년 1반은 축구 패스를 3번 했고, 피구는 안 했음"
  ↓
Genkit Flow:
  - 중복 방지: 최근 3회 수업과 겹치지 않는 활동 우선
  - 학급 특성: 인원수, 선호도, 수준 반영
  - 교육과정 진도: FMS 커버리지 분석 → 부족한 영역 추천
    ↓
출력: "이 학급은 '조작-받기' FMS가 부족합니다. 배구 리시브 짝활동을 추천합니다."
```

#### 4-3. 활동 설명 자동 생성

```
모듈 컴파일 결과 (structure + skill + modifier 조합)
    ↓
LLM이 정리:
  - 도입(7분): 준비운동 + 안전 교육 + 목표 안내
  - 전개1(10분): 기본기 연습 (짝활동 인사이드 패스)
  - 전개2(18분): 게임 적용 (대장패스 인사이드 패스 + 스쿼트 벌칙)
  - 정리(5분): 성찰 + 정리운동
    ↓
출력: 교사용 수업 지도안 (복사 가능한 텍스트)
```

### Genkit 파일 구조

```
functions/                        # Cloud Functions (신규)
├── package.json                  # genkit + firebase-functions
├── src/
│   ├── index.js                  # 함수 진입점
│   ├── flows/
│   │   ├── recommendFlow.js      # 자연어 추천 Flow
│   │   ├── personalizeFlow.js    # 개인화 추천 Flow
│   │   └── explainFlow.js        # 수업안 생성 Flow
│   ├── retriever/
│   │   ├── moduleRetriever.js    # 모듈 벡터 검색
│   │   └── recordRetriever.js    # 수업 기록 검색
│   ├── indexer/
│   │   └── moduleIndexer.js      # 모듈 임베딩 생성
│   └── plugins/
│       └── ollamaPlugin.js       # Ollama 커스텀 플러그인 (또는 GPT-oss)

src/services/genkit/              # 클라이언트 호출 래퍼 (신규)
├── callRecommendFlow.js
└── useGenkitRecommend.js         # React 훅
```

### 벡터 임베딩

Phase 3에서 만든 Firestore 컬렉션(/modules/*, /taxonomy/*, /knowledge/*)에
`embedding: vector(768)` 필드를 추가하여 벡터 검색 활성화.
(상세 구조는 Phase 3 섹션 참조)

---

## Phase 5: 고도화

### PDF 자료 임베딩 파이프라인

```
교사 업로드 (PDF/이미지)
    ↓
Cloud Function: PDF → 텍스트 추출 → 청크 분할
    ↓
Genkit Indexer: 청크 → 임베딩 → /knowledge/documents/{id}에 저장
    ↓
활용: 벡터 검색으로 관련 자료 자동 참조
```

대상 자료는 Phase 3에서 정의한 /knowledge/ 컬렉션에 저장됨.

### 챗봇 UI

```
SketchPage에 채팅 모드 추가:
  [필터 모드] ← 기존 FilterPanel
  [채팅 모드] ← 자연어 대화형 추천

"비 오는 날 3학년이 체육관에서 할 만한 거 추천해줘"
→ "체육관에서 할 수 있는 배구 짝활동(리시브)을 추천합니다.
   도입: 스트레칭 + 공 친숙해지기 (7분)
   전개: 짝활동 리시브 연습 + 거리 늘리기 챌린지 (28분)
   정리: 성찰 + 정리운동 (5분)"
```

### 교사 커뮤니티 모듈 공유 (미래)

```
/community/modules/{id}
  - 교사가 만든 커스텀 모듈을 공유
  - 좋아요/사용 횟수 기반 랭킹
  - 검증된 모듈은 공식 DB에 승격
```

---

## 이번 구현 (Phase 1) 검증

1. `pnpm build` 성공
2. 개발서버에서 수업스케치:
   - 학년: 3~6학년 선택 가능
   - 장소: 운동장/체육관/교실 드롭다운
   - 시간: 30/35/40/45/50분 드롭다운, 기본 40분
   - "후보 생성" → 모듈 컴파일된 3개 카드
   - 컴파일된 카드에 구조 + 기술 + 변형 정보 표시
   - 교실 선택 시 교실 호환 구조만 출력
   - 3학년 선택 시 기본 구조만 출력 (suitablePhase 필터)
   - 모듈 엔진 실패 시 기존 엔진 fallback
3. 모바일 터치 동작
