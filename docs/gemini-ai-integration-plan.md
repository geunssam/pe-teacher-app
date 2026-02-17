# Gemini AI 통합 계획서

> 작성일: 2026-02-16
> 상태: Step 1~6 구현 완료 (Phase A), Step 7 미착수 (Phase B)

## Context
현재 앱("오늘 체육 뭐하지?")은 날씨/시간표/수업설계/학급관리를 지원하지만, 모든 것을 교사가 직접 조작해야 함. Gemini AI를 연결하여 "대화하며 도움받는 앱"으로 진화시키는 것이 목표. Firebase AI Logic(클라이언트)과 Genkit(서버 RAG) 두 시스템을 모두 활용.

## 아키텍처 결정: 두 AI 시스템의 역할 분담

| 구분 | Firebase AI Logic (클라이언트) | Genkit Server (서버) |
|------|------|------|
| **언제** | Phase A (지금 즉시) | Phase B (서버 배포 후) |
| **어디서** | 브라우저에서 직접 Gemini 호출 | Node.js 서버에서 RAG 검색 후 호출 |
| **뭘** | 단발성 텍스트 생성, 설명 보강, 간단한 채팅 | 95개+ 활동 DB 시맨틱 검색, 수업기록 전체 분석 |
| **상태** | ✅ 구현 완료 (Step 1~6) | 서버 코드 완성, API 키 + 배포 필요 |

## 탭별 AI 기능 맵

### 🏠 홈 탭
- **오늘의 AI 한줄 제안** (P1) ✅: 날씨+시간표+최근기록 종합 → "오늘 3학년은 실내에서 균형 활동 추천" 카드

### 📅 시간표 탭
- **수업 기록 AI 활동 추천** (P1) ✅: 기존 하드코딩된 `LESSON_ACTIVITY_LIBRARY` → AI 추천 칩 3개로 교체
- **수업 메모 AI 확장** (P3): 짧은 키워드 → 문장으로 자동 확장

### 📚 수업 설계 탭 (핵심)
- **활동 설명 AI 보강** (P1) ✅: ActivityDetailModal에 `[✨ AI 설명 보강]` 버튼
- **ACE 수업안 AI 생성** (P1) ✅: 활동 선택 후 Acquire/Challenge/Engage 자동 생성
- **대체 활동 AI 추천** (P2): AlternativeActivityModal에서 AI 추천

### 📋 학급 탭
- **학급별 수업 분석** (P2): 영역 균형, 차시 연속성 분석 + 다음 수업 제안

### 🌐 전체 앱
- **플로팅 AI 채팅 버튼** (P1) ✅: 우하단 56x56px 버튼 → 슬라이드업 채팅 패널

## UI/UX 설계

### 플로팅 AI 채팅
- 위치: 우하단 고정, z-40
- 스타일: Gradient `#7C9EF5→#A78BFA`, 스파클 아이콘
- 패널: glassmorphism, 모바일 90vh / 데스크톱 70vh, max-width 400px
- 스트리밍 응답 (한 글자씩 표시)

### 인라인 AI 버튼
- 색상: `bg-[#A78BFA]/10 text-[#A78BFA]` (보라색 톤, AI 전용)
- 접두사: sparkle 아이콘
- 로딩: 스파클 펄스 애니메이션 + "AI가 생각하고 있어요..."

## 구현 순서 (총 7 Step)

### Step 1: AI 인프라 (신규 3개 파일) ✅
- `src/services/ai.js` — Firebase AI Logic 초기화, generatePEContent(), streamPEContent(), createChatSession()
- `src/services/aiPrompts.js` — 기능별 프롬프트 빌더 5개
- `src/hooks/useAI.js` — AI 상태관리 훅 (loading, error, generate, sendMessage)

### Step 2: 공통 UI 컴포넌트 (신규 3개 파일) ✅
- `src/components/common/AIButton.jsx` — 재사용 AI 트리거 버튼
- `src/components/common/AIResponseCard.jsx` — AI 응답 카드 (스트리밍, 접기/펼치기)
- `src/styles/css/components/ai.css` — AI 전용 스타일

### Step 3: 수업 설계 탭 AI (수정 2개 파일) ✅
- `src/components/curriculum/ActivityDetailModal.jsx` — AI 설명 보강 + ACE 수업안 생성 버튼
- `src/components/curriculum/AlternativeActivityModal.jsx` — AI 대체 활동 추천 (미구현, P2)

### Step 4: 글로벌 AI 채팅 (신규 1개 + 수정 1개) ✅
- `src/components/common/AIChatPanel.jsx` — 플로팅 버튼 + 채팅 패널
- `src/App.jsx` — AIChatPanel 삽입

### Step 5: 시간표 탭 AI (수정 1개) ✅
- `src/pages/SchedulePage.jsx` — 수업 기록 모달 내 AI 활동 추천

### Step 6: 홈 탭 AI (신규 1개 + 수정 1개) ✅
- `src/components/home/AIDailySuggestion.jsx` — 오늘의 AI 한줄 제안
- `src/pages/HomePage.jsx` — 카드 삽입

### Step 7: Genkit 서버 활성화 (Phase B) — 미착수
- `server/.env` — 실제 API 키 설정
- Genkit 서버 로컬 실행/배포
- AI 채팅을 Genkit RAG 모드로 확장

## 파일 변경 요약

**신규 8개:** ai.js, aiPrompts.js, useAI.js, AIButton.jsx, AIResponseCard.jsx, AIChatPanel.jsx, AIDailySuggestion.jsx, ai.css
**수정 5개:** App.jsx, HomePage.jsx, SchedulePage.jsx, ActivityDetailModal.jsx, globals.css

## 기술 핵심 포인트

### Firebase AI Logic 초기화 패턴
```js
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'
import app from './firebase'
const ai = getAI(app, { backend: new GoogleAIBackend() })
const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' })
```

### API 키
- Firebase AI Logic: firebaseConfig.apiKey 사용 (별도 키 불필요)
- Firebase Console에서 Gemini Developer API 활성화 필요
- Genkit: Google AI Studio에서 별도 API 키 발급 필요

### 무료 한도 (Spark Plan, Gemini 2.5 Flash)
- 분당 10회, 일 250회 (교사 1인 사용 충분)
- 응답 캐싱 (sessionStorage 5분) + 버튼 쿨다운 3초로 절약

### 오프라인 대응
- navigator.onLine 체크 → AI 불가 시 버튼 비활성화
- 기존 rule-based 추천(LESSON_ACTIVITY_LIBRARY)은 fallback으로 유지

## 남은 작업 (Phase B + P2/P3)
1. **Step 7**: Genkit 서버 배포 + RAG 모드 채팅 확장
2. **대체 활동 AI 추천** (P2): AlternativeActivityModal
3. **학급별 수업 분석** (P2): 영역 균형, 차시 연속성
4. **수업 메모 AI 확장** (P3): 키워드 → 문장 확장
5. **Firebase Console**: Gemini Developer API 활성화 (필수 선행)

## 검증 방법
1. `pnpm dev`로 개발 서버 실행
2. 수업 설계 탭 → 활동 상세 → AI 설명 보강 버튼 클릭 → 텍스트 생성 확인
3. 플로팅 AI 버튼 → 채팅 패널 → "3학년 실내 활동 추천해줘" 전송 → 스트리밍 응답 확인
4. 시간표 → 수업 기록 → AI 추천 칩 표시 확인
5. 홈 탭 → AI 한줄 제안 카드 표시 확인
6. 크롬 개발자도구 Network 탭에서 Gemini API 호출 확인
7. 무료 한도 내 동작 확인 (콘솔에 429 에러 없음)
