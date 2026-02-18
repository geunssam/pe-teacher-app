# Gemini + Genkit RAG 수업 추천 설계서

> Phase 4 — "오늘 체육 뭐하지?" 앱의 AI 수업 추천 시스템
> 작성일: 2026-02-16 | 버전: 2.0.0
> 변경: Ollama/FastAPI/ChromaDB → **Gemini API(무료) + Genkit + dev-local-vectorstore**

---

## 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [Gemini 모델 선정](#2-gemini-모델-선정)
3. [Genkit 설정](#3-genkit-설정)
4. [RAG 파이프라인](#4-rag-파이프라인)
5. [하이브리드 추천 전략](#5-하이브리드-추천-전략)
6. [Flow 설계](#6-flow-설계)
7. [프론트엔드 연동](#7-프론트엔드-연동)
8. [성능 목표](#8-성능-목표)
9. [단계별 구현 로드맵](#9-단계별-구현-로드맵)

---

## 1. 전체 아키텍처

### 1.1 v1 → v2 변경 요약

| 항목 | v1 (이전) | v2 (현재) |
|------|----------|----------|
| LLM | Ollama + Gemma 12B (로컬) | **Gemini 2.5 Flash API (무료)** |
| RAG 프레임워크 | 직접 구현 (FastAPI) | **Genkit** |
| 벡터 저장소 | ChromaDB (Python) | **dev-local-vectorstore** (Genkit 플러그인) |
| 임베딩 | nomic-embed-text (Ollama) | **gemini-embedding-001** (API) |
| 서버 | FastAPI (Python) | **Genkit 서버 (Node.js)** |
| 배포 | 로컬 전용 | **로컬 + Cloud Functions for Firebase** |
| 설치 부담 | Ollama + Python + 7GB 모델 | **npm install만** |

### 1.2 시스템 구성도

```
┌─────────────────────────────────────────────────────────┐
│                  프론트엔드 (React + Vite)                 │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │ 필터 패널     │   │ AI 추천 버튼  │   │ 채팅 UI     │ │
│  │ (기존 규칙)   │   │ (옵트인)      │   │ (Phase D)   │ │
│  └──────┬───────┘   └──────┬───────┘   └──────┬──────┘ │
│         │                  │                   │        │
│         ▼                  ▼                   ▼        │
│  ┌──────────────────────────────────────────────────┐   │
│  │          추천 오케스트레이터 (useRecommend 확장)     │   │
│  │  ┌─────────────┐        ┌─────────────────────┐  │   │
│  │  │ 빠른 경로    │        │ 풍부한 경로          │  │   │
│  │  │ (규칙 기반)  │        │ (Genkit Flow 호출)   │  │   │
│  │  │ < 50ms      │        │ HTTP/SSE            │  │   │
│  │  └─────────────┘        └──────────┬──────────┘  │   │
│  └─────────────────────────────────────┼────────────┘   │
└────────────────────────────────────────┼────────────────┘
                                         │ HTTP (localhost:3400)
                                         ▼
┌─────────────────────────────────────────────────────────┐
│               Genkit 서버 (Node.js)                      │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                   Genkit Flows                     │  │
│  │                                                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │  │
│  │  │ recommend │  │ chat     │  │ syncRecords    │  │  │
│  │  │ Flow     │  │ Flow     │  │ Flow           │  │  │
│  │  └────┬─────┘  └────┬─────┘  └──────┬─────────┘  │  │
│  └───────┼──────────────┼───────────────┼────────────┘  │
│          │              │               │               │
│    ┌─────┼──────────────┼───────────────┼──────────┐    │
│    │     ▼              ▼               ▼          │    │
│    │  ┌──────────┐  ┌──────────────────────────┐   │    │
│    │  │ Gemini   │  │ dev-local-vectorstore     │   │    │
│    │  │ 2.5 Flash│  │ (벡터 검색 + 임베딩)       │   │    │
│    │  │ (생성)   │  │ embedder: gemini-embedding │   │    │
│    │  └──────────┘  └──────────────────────────┘   │    │
│    │           Google AI API (무료 티어)              │    │
│    └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 1.3 데이터 흐름

```
사용자 질문 (자연어 또는 필터 선택)
    │
    ├─ 빠른 경로: 필터 UI → 규칙 기반 조합 → 후보 3개 (< 50ms, 오프라인 가능)
    │
    └─ 풍부한 경로: "AI 추천" 버튼 클릭
         │
         ├─ 1. Genkit recommendFlow 호출 (HTTP POST)
         ├─ 2. 의도 파싱: Gemini로 자연어 → 필터 JSON 변환
         ├─ 3. RAG 검색: dev-local-vectorstore에서 유사 활동 검색
         ├─ 4. 규칙 기반 후보: 기존 엔진으로 pre-filter 5~8개
         ├─ 5. 프롬프트 조립: 컨텍스트 + RAG + 후보 + 질문
         ├─ 6. Gemini 생성: 추천 이유 + 운영 팁 (스트리밍)
         └─ 7. 응답 반환: JSON 구조화된 추천 결과
```

---

## 2. Gemini 모델 선정

### 2.1 무료 티어 한도 (Google AI Studio)

| 항목 | Gemini 2.0 Flash | Gemini 1.5 Flash |
|------|-----------------|-----------------|
| **요청 수** | 1,500회/일 | 1,500회/일 |
| **토큰** | 100만 토큰/일 | 100만 토큰/일 |
| **RPM** | 15회/분 | 15회/분 |
| **컨텍스트** | 100만 토큰 | 100만 토큰 |
| **한국어** | 최상 | 상 |
| **속도** | 매우 빠름 | 빠름 |
| **비용** | **무료** | **무료** |

### 2.2 사용 모델

| 용도 | 모델 | Genkit 모델 ID |
|------|------|---------------|
| **텍스트 생성** | Gemini 2.5 Flash | `googleai/gemini-2.5-flash` |
| **텍스트 임베딩** | Gemini Embedding 001 | `googleai/gemini-embedding-001` |

### 2.3 사용량 계산

체육 교사 1명 기준 일일 사용량 예상:

| 기능 | 호출 수 | 토큰/회 | 일일 토큰 |
|------|--------|--------|----------|
| AI 수업 추천 | ~10회 | ~2,000 | ~20,000 |
| 자연어 채팅 | ~5회 | ~1,500 | ~7,500 |
| 의도 파싱 | ~15회 | ~500 | ~7,500 |
| 수업 기록 임베딩 | ~5회 | ~200 | ~1,000 |
| **합계** | **~35회** | — | **~36,000** |

→ 무료 한도(1,500회/일, 100만 토큰/일) 대비 **2.3% 사용**. 여유 충분.

### 2.4 주의사항: 무료 티어 제약

- **데이터 학습**: 무료 티어 입력은 Google 모델 개선에 사용될 수 있음
  - 대응: 학생 이름 등 개인정보를 프롬프트에 포함하지 않음
  - 활동명, 학년, 장소 등 일반적 교육 정보만 전송
- **SLA 없음**: 무료이므로 가용성 보장 없음
  - 대응: Fallback으로 규칙 기반 추천이 항상 작동
- **Rate Limit**: 15 RPM
  - 대응: 교사 1인 사용 기준으로 충분

---

## 3. Genkit 설정

### 3.1 프로젝트 구조

```
server/                            # Genkit 서버 (프로젝트 루트의 server/ 폴더)
├── src/
│   ├── index.ts                   # Genkit 앱 진입점 + Flow 등록
│   ├── genkit.ts                  # Genkit 인스턴스 설정 (플러그인, 모델)
│   │
│   ├── flows/
│   │   ├── recommendFlow.ts       # 추천 Flow (RAG 검색 + Gemini 생성)
│   │   ├── chatFlow.ts            # 자연어 대화 Flow
│   │   ├── syncRecordsFlow.ts     # 수업 기록 임베딩 동기화 Flow
│   │   ├── ingestDocumentFlow.ts  # 텍스트 문서 업로드 → RAG 인덱싱
│   │   └── uploadPdfFlow.ts       # PDF 업로드 → 청킹 → RAG 인덱싱
│   │
│   ├── rag/
│   │   ├── indexer.ts             # 활동/교육과정 데이터 → 벡터 인덱싱
│   │   ├── retriever.ts           # 유사도 검색 + 메타데이터 필터링
│   │   └── dataLoader.ts          # JSON → Document 변환 유틸
│   │
│   ├── prompts/
│   │   ├── system.prompt           # 시스템 프롬프트 (Dotprompt)
│   │   ├── recommend.prompt        # 추천 프롬프트 템플릿
│   │   └── intentParse.prompt      # 의도 파싱 프롬프트
│   │
│   └── utils/
│       ├── intentParser.ts        # 규칙 기반 의도 파싱 (키워드 매칭)
│       └── scoreMerger.ts         # [미사용] 이전 모듈 시스템용 점수 병합
│
├── data/
│   └── vectorstore/               # dev-local-vectorstore 영속 저장
│
├── package.json
├── tsconfig.json
└── .env                           # GOOGLE_GENAI_API_KEY
```

### 3.2 핵심 설정 코드

#### `server/src/genkit.ts` — Genkit 인스턴스

```typescript
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { devLocalVectorstore } from '@genkit-ai/dev-local-vectorstore';

export const ai = genkit({
  plugins: [
    // Gemini API (무료 티어)
    googleAI(),

    // 로컬 벡터 저장소 (개발용, 프로덕션에서는 Firestore 벡터로 전환 가능)
    devLocalVectorstore([
      {
        indexName: 'pe_activities',
        embedder: googleAI.embedder('gemini-embedding-001'),
      },
      {
        indexName: 'pe_curriculum',
        embedder: googleAI.embedder('gemini-embedding-001'),
      },
      {
        indexName: 'pe_records',
        embedder: googleAI.embedder('gemini-embedding-001'),
      },
      {
        indexName: 'pe_knowledge',
        embedder: googleAI.embedder('gemini-embedding-001'),
      },
    ]),
  ],
});
```

#### `server/.env` — API 키

```bash
GOOGLE_GENAI_API_KEY=your_api_key_here
# Google AI Studio(https://aistudio.google.com)에서 무료 발급
```

### 3.3 의존성

```json
{
  "dependencies": {
    "genkit": "^1.14.0",
    "@genkit-ai/google-genai": "^1.14.0",
    "@genkit-ai/dev-local-vectorstore": "^1.14.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsx": "^4.0.0"
  }
}
```

### 3.4 실행 명령어

```bash
cd server
npm install

# 개발 서버 (Genkit Dev UI 포함, http://localhost:4000)
npx genkit start -- npx tsx src/index.ts

# 또는 단순 실행 (Flow HTTP 서버만)
npx tsx src/index.ts
# → http://localhost:3400 에서 Flow 호출 가능
```

---

## 4. RAG 파이프라인

### 4.1 데이터 소스

| 소스 | 문서 수 | 청킹 | 컬렉션 | 업데이트 |
|------|--------|------|--------|---------|
| 활동 DB (`modules/activities.json` + `curriculum/activities/`) | ~60개 | 1활동=1문서 | `pe_activities` | 정적 (배포 시) |
| 교육과정 (`curriculum/standards.json` + `unitTemplates.json`) | ~45개 | 1성취기준=1문서 | `pe_curriculum` | 정적 |
| 수업 기록 (`pe_class_records`) | 0~500+ | 1기록=1문서 | `pe_records` | **동적** (수업 시) |

총 문서 수: ~105개(정적) + 동적 기록 → **소규모, dev-local-vectorstore로 충분**

### 4.2 문서 변환 (dataLoader.ts)

```typescript
import { Document } from 'genkit/retriever';

// 활동 → Document
export function activityToDocument(activity: Activity): Document {
  const text = `
활동명: ${activity.name}
종목: ${activity.sportName}
장소: ${activity.space.join(', ')}
인원: ${activity.groupSize}명
단계: ${activity.suitablePhase}
난이도: ${activity.difficultyBase}/3
FMS 영역: ${activity.compatibleFmsCategories?.join(', ') || '없음'}
설명: ${activity.description}
진행 흐름: ${activity.flow?.map((f, i) => `${i + 1}. ${f}`).join(' ') || ''}
지도 팁: ${activity.teachingTips?.join(' ') || ''}
필요 장비: ${activity.equipment?.join(', ') || '없음'}
`.trim();

  return Document.fromText(text, {
    // 메타데이터 → 필터링에 사용
    activityId: activity.id,
    sport: activity.sportId,
    space: activity.space,
    phase: activity.suitablePhase,
    difficulty: activity.difficultyBase,
  });
}

// 수업 기록 → Document
export function recordToDocument(record: ClassRecord): Document {
  const text = `
수업일: ${record.classDate}
학급: ${record.className}
활동명: ${record.activity}
영역: ${record.domain}
차시: ${record.sequence}
수행도: ${record.performance}
교사 메모: ${record.memo || ''}
`.trim();

  return Document.fromText(text, {
    recordId: record.id,
    classId: record.classId,
    domain: record.domain,
    performance: record.performance,
    classDate: record.classDate,
  });
}
```

### 4.3 인덱싱 (indexer.ts)

```typescript
import { devLocalIndexerRef } from '@genkit-ai/dev-local-vectorstore';
import { ai } from '../genkit.js';
import { activityToDocument, recordToDocument } from './dataLoader.js';

const activitiesIndexer = devLocalIndexerRef('pe_activities');
const curriculumIndexer = devLocalIndexerRef('pe_curriculum');
const recordsIndexer = devLocalIndexerRef('pe_records');

// 정적 데이터 인덱싱 (서버 시작 시 1회 실행)
export async function indexStaticData(activities: Activity[], curriculum: Standard[]) {
  const activityDocs = activities.map(activityToDocument);
  await ai.index({ indexer: activitiesIndexer, documents: activityDocs });

  const curriculumDocs = curriculum.map(standardToDocument);
  await ai.index({ indexer: curriculumIndexer, documents: curriculumDocs });

  console.log(`Indexed ${activityDocs.length} activities, ${curriculumDocs.length} standards`);
}

// 수업 기록 증분 인덱싱 (새 기록 저장 시 호출)
export async function indexRecords(records: ClassRecord[]) {
  const docs = records.map(recordToDocument);
  await ai.index({ indexer: recordsIndexer, documents: docs });
  return docs.length;
}
```

### 4.4 검색 (retriever.ts)

```typescript
import { devLocalRetrieverRef } from '@genkit-ai/dev-local-vectorstore';
import { ai } from '../genkit.js';

const activitiesRetriever = devLocalRetrieverRef('pe_activities');
const recordsRetriever = devLocalRetrieverRef('pe_records');

// 유사 활동 검색
export async function searchActivities(query: string, k = 8) {
  return ai.retrieve({
    retriever: activitiesRetriever,
    query,
    options: { k },
  });
}

// 유사 수업 기록 검색
export async function searchRecords(query: string, k = 5) {
  return ai.retrieve({
    retriever: recordsRetriever,
    query,
    options: { k },
  });
}
```

---

## 5. 하이브리드 추천 전략

### 5.1 두 경로의 역할

```
┌───────────────────────────────────────────────────────┐
│                 추천 오케스트레이터                       │
│                                                       │
│  ┌──────────────────┐      ┌────────────────────────┐ │
│  │  빠른 경로 (기본)   │      │  풍부한 경로 (옵트인)    │ │
│  │                  │      │                        │ │
│  │  ✓ 항상 사용      │      │  ✓ "AI 추천" 클릭 시    │ │
│  │  ✓ 필터 UI 기반   │      │  ✓ 자연어 입력 시       │ │
│  │  ✓ < 50ms        │      │  ✓ 1~3초              │ │
│  │  ✓ 오프라인 가능   │      │  ✓ 인터넷 필요         │ │
│  │                  │      │                        │ │
│  │  출력:            │      │  출력:                  │ │
│  │  - 후보 3개       │      │  - 후보 3개 + 추천 이유  │ │
│  │  - 점수 + 검증    │      │  - 수업 운영 조언       │ │
│  │  - 장비 목록      │      │  - 과거 기록 참조       │ │
│  │                  │      │  - 교육과정 연계 설명    │ │
│  └──────────────────┘      └────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

### 5.2 Fallback 전략

```
Genkit 서버 상태 확인 (GET /api/health)
    │
    ├─ 정상 → 풍부한 경로 사용
    │
    ├─ 서버 미실행 → 빠른 경로 + "AI 추천 서버를 시작해주세요" 안내
    │
    ├─ API 키 미설정 → 빠른 경로 + "Google AI API 키를 설정해주세요" 안내
    │
    └─ 응답 지연 (> 5초) → 빠른 경로 결과 먼저 표시 + AI 결과 나중에 병합
```

### 5.3 점수 체계 (현행)

> **참고**: 이전 설계에서는 `scoreMerger.ts`로 규칙 기반(70%) + AI 신뢰도(20%) + 개인화(10%) 하이브리드 점수를 계획했으나, 프로젝트가 모듈 기반에서 **교육과정 기반 + Genkit RAG**로 전환되면서 규칙 기반 점수 엔진(`scoreCandidate.js`)이 구현되지 않았습니다. `scoreMerger.ts` 파일은 존재하지만 **미사용(dead code)** 상태입니다.

현재 점수 체계:
- **confidence** (0.0~1.0): Gemini가 RAG 검색 결과 + 교사 요청 컨텍스트를 종합하여 반환하는 적합도 점수
- UI에서 confidence를 4단계로 표시: 매우 적합(≥0.8), 적합(≥0.6), 보통(≥0.4), 참고(<0.4)

```
사용자 요청 → RAG 검색(활동+기록+지식) → Gemini 생성 → confidence 포함 JSON 반환
```

---

## 6. Flow 설계

### 6.1 recommendFlow — 하이브리드 추천

```typescript
import { z } from 'genkit';
import { ai } from '../genkit.js';
import { googleAI } from '@genkit-ai/google-genai';
import { searchActivities, searchRecords } from '../rag/retriever.js';

const RecommendInput = z.object({
  query: z.string().describe('자연어 질문 또는 필터 요약'),
  filters: z.object({
    grade: z.string().optional(),
    space: z.string().optional(),
    sport: z.string().optional(),
    weather: z.string().optional(),
    studentCount: z.number().optional(),
    duration: z.number().optional(),
  }).optional(),
  recentActivities: z.array(z.string()).optional(),
});

const RecommendOutput = z.object({
  recommendations: z.array(z.object({
    activityId: z.string(),
    reason: z.string(),
    teachingAdvice: z.string(),
    modifiers: z.array(z.string()),
    confidence: z.number(),
  })),
  summary: z.string(),
});

export const recommendFlow = ai.defineFlow(
  {
    name: 'recommendFlow',
    inputSchema: RecommendInput,
    outputSchema: RecommendOutput,
  },
  async (input) => {
    // 1. RAG 검색: 유사 활동 + 과거 기록
    const [relatedActivities, pastRecords] = await Promise.all([
      searchActivities(input.query, 8),
      searchRecords(input.query, 5),
    ]);

    // 2. Gemini로 추천 생성
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `
## 교사 상황
- 질문: ${input.query}
- 학년: ${input.filters?.grade || '미지정'}
- 장소: ${input.filters?.space?.join(', ') || '미지정'}
- 날씨: ${input.filters?.weather || '미지정'}
- 인원: ${input.filters?.studentCount || '미지정'}명

## 관련 활동 (RAG 검색 결과)
${relatedActivities.map((doc, i) => `${i + 1}. ${doc.text}`).join('\n\n')}

## 과거 수업 기록
${pastRecords.length > 0
  ? pastRecords.map((doc, i) => `${i + 1}. ${doc.text}`).join('\n\n')
  : '아직 수업 기록이 없습니다.'}

## 최근 사용한 활동 (피해주세요)
${input.recentActivities?.join(', ') || '없음'}

위 정보를 참고하여 가장 적합한 활동 3개를 추천해주세요.
`,
      system: SYSTEM_PROMPT,
      output: { schema: RecommendOutput },
    });

    return output!;
  }
);

const SYSTEM_PROMPT = `당신은 초등 체육 수업 설계 전문가입니다.
한국의 2022 개정 교육과정에 따라 수업 활동을 추천합니다.

규칙:
1. 반드시 [관련 활동]에서 선택하여 추천하세요.
2. 최근 사용한 활동은 피하세요.
3. 안전 규칙을 항상 포함하세요.
4. 추천 이유는 교육적 관점에서 2-3문장으로 설명하세요.
5. 수업 운영 팁은 현장 경험에 기반한 실용적 조언 1-2문장으로 작성하세요.

학년별 지도 원칙:
- 3-4학년: FMS(기본 움직임) 중심, 간단한 규칙, 기본 단계 구조 우선
- 5-6학년: 스포츠 기술 중심, 전술 이해, 응용-챌린지 단계 가능`;
```

### 6.2 chatFlow — 자연어 대화 (Phase D)

```typescript
export const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.object({
      message: z.string(),
      history: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
      })).optional(),
    }),
    outputSchema: z.string(),
  },
  async ({ message, history }) => {
    // RAG 검색으로 관련 활동 찾기
    const relatedDocs = await searchActivities(message, 5);
    const context = relatedDocs.map(doc => doc.text).join('\n---\n');

    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `${SYSTEM_PROMPT}\n\n참고 활동 정보:\n${context}`,
      messages: [
        ...(history || []).map(h => ({
          role: h.role as 'user' | 'model',
          content: [{ text: h.content }],
        })),
        { role: 'user', content: [{ text: message }] },
      ],
    });

    return response.text;
  }
);
```

### 6.3 syncRecordsFlow — 수업 기록 동기화

```typescript
export const syncRecordsFlow = ai.defineFlow(
  {
    name: 'syncRecordsFlow',
    inputSchema: z.object({
      records: z.array(z.object({
        id: z.string(),
        activity: z.string(),
        domain: z.string(),
        sequence: z.number().optional(),
        performance: z.string().optional(),
        memo: z.string().optional(),
        className: z.string().optional(),
        classDate: z.string(),
      })),
    }),
    outputSchema: z.object({
      embedded: z.number(),
      totalRecords: z.number(),
    }),
  },
  async ({ records }) => {
    const count = await indexRecords(records);
    return { embedded: count, totalRecords: count };
  }
);
```

---

## 7. 프론트엔드 연동

### 7.1 API 호출 유틸

```typescript
// src/services/genkit.js

const GENKIT_BASE_URL = import.meta.env.VITE_GENKIT_URL || 'http://localhost:3400';

// 서버 상태 확인
export async function checkGenkitHealth() {
  try {
    const res = await fetch(`${GENKIT_BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 추천 요청
export async function requestRecommendation({ query, filters, recentActivities }) {
  const res = await fetch(`${GENKIT_BASE_URL}/recommendFlow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: { query, filters, recentActivities },
    }),
  });
  const json = await res.json();
  return json.result;
}

// 채팅 요청
export async function sendChatMessage({ message, history }) {
  const res = await fetch(`${GENKIT_BASE_URL}/chatFlow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: { message, history },
    }),
  });
  const json = await res.json();
  return json.result;
}

// 수업 기록 동기화
export async function syncRecords(records) {
  const res = await fetch(`${GENKIT_BASE_URL}/syncRecordsFlow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { records } }),
  });
  const json = await res.json();
  return json.result;
}
```

### 7.2 useRecommend 훅 (구현 완료)

```javascript
// src/hooks/useRecommend.js — AI 수업 추천 오케스트레이터

import { useState, useCallback, useEffect, useRef } from 'react'
import { checkGenkitHealth, requestRecommendation } from '../services/genkit'

export function useRecommend() {
  const [aiRecommendations, setAiRecommendations] = useState(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [isGenkitAvailable, setIsGenkitAvailable] = useState(false)

  // Health check on mount
  useEffect(() => {
    checkGenkitHealth().then(setIsGenkitAvailable)
  }, [])

  // AI recommendation request
  const requestAiRecommend = useCallback(async (query, filters, recentActivities) => {
    if (!isGenkitAvailable) { setAiError('서버 미연결'); return null }
    setIsAiLoading(true)
    try {
      const result = await requestRecommendation({ query, filters, recentActivities })
      setAiRecommendations(result)
      return result
    } catch (err) {
      setAiError(err.message)
      return null // fallback: rule-based results remain
    } finally {
      setIsAiLoading(false)
    }
  }, [isGenkitAvailable])

  return { aiRecommendations, isAiLoading, aiError, isGenkitAvailable,
           requestAiRecommend, clearAiRecommendations, recheckHealth }
}
```

**UI 컴포넌트**: `src/components/common/AiRecommendCard.jsx` — AI 추천 결과 전용 카드

### 7.3 Vite 프록시 설정

```javascript
// vite.config.js에 추가
export default defineConfig({
  server: {
    proxy: {
      // 기존 프록시 유지...
      '/genkit': {
        target: 'http://localhost:3400',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/genkit/, ''),
      },
    },
  },
});
```

---

## 8. 성능 목표

### 8.1 응답 시간

| 경로 | 목표 | 세부 |
|------|------|------|
| 빠른 경로 (규칙 기반) | < 50ms | 기존 엔진 (변경 없음) |
| 의도 파싱 (규칙 기반) | < 10ms | 키워드 매칭 |
| RAG 검색 | < 500ms | dev-local-vectorstore + gemini-embedding |
| **Gemini 생성 (전체)** | **1~3초** | Flash 모델, ~200토큰 출력 |
| **풍부한 경로 전체** | **2~4초** | Ollama(3~8초) 대비 크게 단축 |

### 8.2 리소스 사용

| 항목 | Ollama (v1) | Genkit (v2) |
|------|-------------|-------------|
| RAM | ~10GB (모델 로딩) | **~200MB** (Node.js 서버만) |
| 디스크 | ~7GB (모델 파일) | **~50MB** (벡터 데이터) |
| GPU | 60~90% (추론 시) | **0%** (API 호출이므로) |
| 설치 | Ollama + Python + pip | **npm install** |

### 8.3 Cold Start

| 상태 | v1 (Ollama) | v2 (Genkit) |
|------|-------------|-------------|
| 서버 미시작 | 30~60초 (모델 로딩) | **2~3초** (Node.js 시작) |
| 첫 요청 | 5~10초 (모델 웜업) | **1~2초** (API 첫 호출) |
| 이후 요청 | 2~5초 | **1~3초** |

---

## 9. 단계별 구현 로드맵

### Phase 4-A: Genkit 서버 + 기본 생성 (1주)

| 단계 | 작업 | 산출물 |
|------|------|--------|
| A-1 | Google AI Studio에서 API 키 발급 | `.env` 파일 |
| A-2 | `server/` 프로젝트 초기화 (Genkit + TypeScript) | `package.json`, `tsconfig.json` |
| A-3 | `genkit.ts` 설정 (Gemini + dev-local-vectorstore) | Genkit 인스턴스 |
| A-4 | 간단한 `chatFlow` 구현 | 자유 질의 → Gemini 응답 |
| A-5 | Genkit Dev UI로 테스트 | `npx genkit start` → localhost:4000 |
| A-6 | 프론트엔드 `services/genkit.js` 유틸 작성 | API 호출 함수 |

**검증**: Genkit Dev UI에서 "3학년 교실 수업 추천해줘" → 한국어 응답 확인

### Phase 4-B: RAG 인덱싱 + 검색 (1~2주)

| 단계 | 작업 | 산출물 |
|------|------|--------|
| B-1 | `dataLoader.ts` — 활동/교육과정 JSON → Document 변환 | 변환 유틸 |
| B-2 | `indexer.ts` — 정적 데이터 인덱싱 | 서버 시작 시 자동 인덱싱 |
| B-3 | `retriever.ts` — 유사도 검색 구현 | 검색 함수 |
| B-4 | Dotprompt 템플릿 작성 (`system.prompt`, `recommend.prompt`) | 프롬프트 파일 |
| B-5 | `recommendFlow` 구현 (RAG + Gemini 통합) | 추천 Flow |
| B-6 | 프론트엔드에 "AI 추천" 버튼 연동 | 버튼 → Flow 호출 → 결과 표시 |

**검증**: "교실에서 할 수 있는 술래 놀이" → RAG 검색 결과 기반 추천 3개

### Phase 4-C: 수업 기록 RAG + 개인화 (1~2주)

| 단계 | 작업 | 산출물 |
|------|------|--------|
| C-1 | `syncRecordsFlow` 구현 | 수업 기록 임베딩 API |
| C-2 | 프론트엔드 수업 기록 저장 시 자동 sync | `useClassManager` 확장 |
| C-3 | 개인화 점수 로직 | Gemini confidence + 과거 기록 컨텍스트 |
| C-4 | 프롬프트에 과거 기록 컨텍스트 추가 | 추천 품질 향상 |

**검증**: 기록 10개 후 "지난번에 아이들이 좋아했던 거 비슷한 것" → 과거 기록 참조 응답

### Phase 4-D: UI 통합 + 채팅 (2주)

| 단계 | 작업 | 산출물 |
|------|------|--------|
| D-1 | AI 추천 결과 카드 컴포넌트 | `AiRecommendCard.jsx` |
| D-2 | 채팅 인터페이스 (하단 시트) | `AiChatPanel.jsx` |
| D-3 | Genkit 상태 표시 UI | `GenkitStatus.jsx` |
| D-4 | 후속 질문 칩 UI | "변형 추가할까요?" 등 |
| D-5 | 에러 처리 + fallback | 로딩, 타임아웃, 오프라인 |

**검증**: AI 추천 전체 흐름 E2E 테스트

### 전체 타임라인

```
Phase 4-A ████░░░░░░░░░░░░░░░░  (1주)
Phase 4-B      ████████░░░░░░░░  (1~2주)
Phase 4-C              ████████  (1~2주)
Phase 4-D          ████████████  (2주, B와 병행)
────────────────────────────────
         총 예상: 4~6주 (v1 대비 절반 단축)
```

### 선행 조건

| 조건 | 상태 | 비고 |
|------|------|------|
| Google AI Studio API 키 | 미발급 | https://aistudio.google.com |
| Phase 2.5 (모듈 시스템) 완료 | 진행 중 | 활동 DB 안정 후 임베딩 가능 |
| Phase 3 (Firebase) 완료 | 미착수 | 선택사항 — localStorage로도 가능 |
| Node.js 18+ | ✅ | 이미 설치됨 (Vite 프로젝트) |

---

## 부록 A: v1 대비 이점 요약

| 항목 | v1 (Ollama) | v2 (Gemini + Genkit) |
|------|-------------|---------------------|
| 설치 시간 | 30분+ (Ollama + 모델 + Python + pip) | **5분** (npm install + API키) |
| 디스크 사용 | ~7GB | **~50MB** |
| 메모리 사용 | ~10GB | **~200MB** |
| 응답 속도 | 3~8초 | **1~3초** |
| 한국어 품질 | 상 (Gemma 12B) | **최상 (Gemini Flash)** |
| 다른 기기 사용 | 불가 (로컬 전용) | **가능** (API 기반) |
| 유지보수 | Ollama 업데이트 + 모델 관리 | **자동** (Google 관리) |
| 비용 | 무료 (전기세) | **무료** (1,500회/일) |
| 구현 기간 | 8~12주 | **4~6주** |

## 부록 B: 프로덕션 배포 (미래)

개발 단계가 안정화되면 Cloud Functions for Firebase로 배포 가능:

```bash
# Firebase Functions에 Genkit Flow 배포
firebase deploy --only functions
```

- dev-local-vectorstore → Firestore 벡터 검색 또는 Vertex AI Vector Search로 전환
- 로컬 서버 불필요, 서버리스로 자동 스케일링
- Firebase Auth와 연동하여 교사별 개인화 자연스럽게 통합

---

> **문서 끝**
> v2.0.0: Ollama/FastAPI/ChromaDB → Gemini API(무료) + Genkit + dev-local-vectorstore 전환
> 이 설계서는 Phase 4 구현 가이드입니다.
