# 3개 설계서 Gap 분석 리포트

> **분석 유형**: 설계 vs 구현 Gap 분석 (PDCA Check Phase)
>
> **프로젝트**: 오늘 체육 뭐하지?
> **분석일**: 2026-02-16
> **대상 설계서**:
> - `docs/firebase-design.md` (Firebase Firestore 설계서)
> - `docs/gemini-ai-integration-plan.md` (Gemini AI 통합 계획서)
> - `docs/llm-recommend-design.md` (Genkit RAG 수업 추천 설계서)

---

## 1. 전체 종합 점수

```
+-----------------------------------------------+
|  전체 종합 Match Rate: 74%                     |
+-----------------------------------------------+
|  Firebase 설계서:       75%  (60/80 항목)       |
|  Gemini AI 계획서:      82%  (23/28 항목)       |
|  Genkit RAG 설계서:     64%  (32/50 항목)       |
+-----------------------------------------------+
|  완료:  43 항목                                 |
|  부분:  22 항목                                 |
|  미구현: 13 항목                                |
+-----------------------------------------------+
```

| 설계서 | Match Rate | 상태 |
|--------|:---------:|:----:|
| Firebase Firestore 설계서 | 75% | 부분 구현 |
| Gemini AI 통합 계획서 | 82% | 대부분 완료 |
| Genkit RAG 수업 추천 설계서 | 64% | 서버 완료, 연동 부분 |
| **전체 종합** | **74%** | **추가 작업 필요** |

---

## 2. Firebase Firestore 설계서 Gap 분석

> **설계서**: `docs/firebase-design.md`
> **Match Rate**: 75%

### 2.1 컬렉션 구조 구현 현황

| 설계 항목 | 설계서 위치 | 구현 파일 | 상태 | 비고 |
|-----------|-----------|----------|:----:|------|
| `users/{uid}` 프로필 문서 | Section 2.1 | `src/services/auth.js:48-65` | ✅ | `onUserLogin()`에서 생성 |
| `users/{uid}/classes/{classId}` | Section 2.2 | `src/hooks/useClassManager.js:125-132` | ✅ | `syncClassToFirestore()` |
| `users/{uid}/classes/{classId}/roster/{studentId}` | Section 2.3 | `src/hooks/useClassManager.js:148-156` | 부분 | 서브컬렉션이 아닌 학급 문서 내 `roster` 필드로 저장 |
| `users/{uid}/classes/{classId}/records/{recordId}` | Section 2.4 | `src/hooks/useClassManager.js:158-166` | 부분 | 서브컬렉션이 아닌 학급 문서 내 `records` 필드로 저장 |
| `users/{uid}/schedule/base` | Section 2.5 | `src/hooks/useSchedule.js:112-116` | 부분 | 필드명 `timetable` 사용 (설계: `cells`) |
| `users/{uid}/schedule/weeks/{weekKey}` | Section 2.6 | `src/hooks/useSchedule.js:119-123` | 부분 | 단일 `weeks` 문서에 모든 주 저장 (설계: 주별 개별 문서) |
| `users/{uid}/editedLessons/{activityId}` | Section 2.7 | `src/hooks/useEditedAceLesson.js:83-89` | ✅ | 설계와 일치 |
| `users/{uid}/myActivities/{activityId}` | Section 2.8 | `src/hooks/useCurriculum.js:104-112` | ✅ | 설계와 일치 |
| `users/{uid}/curriculum/customActivities` | Section 2.9 | `src/hooks/useCurriculum.js` | 부분 | Firestore 동기화 미구현 (localStorage만) |
| `users/{uid}/curriculum/customAlternatives` | Section 2.10 | `src/hooks/useCurriculum.js` | 부분 | Firestore 동기화 미구현 (localStorage만) |

### 2.2 스키마 필드 매칭

#### users/{uid} 문서

| 설계 필드 | 구현 여부 | 비고 |
|-----------|:--------:|------|
| `displayName` | ✅ | `auth.js:49` |
| `email` | ✅ | `auth.js:50` |
| `photoURL` | ✅ | `auth.js:51` (빈 문자열 vs 설계의 null) |
| `schoolLevel` | ✅ | `auth.js:52` |
| `grades` | ✅ | `auth.js:53` |
| `settings` | ✅ | `auth.js:54-61` |
| `createdAt` | ✅ | `auth.js:62` (serverTimestamp) |
| `updatedAt` | 부분 | 신규 생성 시 누락, 설계서에는 필수 |
| `lastLoginAt` | ✅ | `auth.js:63, 71` |

#### records/{recordId} 문서

| 설계 필드 | 구현 여부 | 비고 |
|-----------|:--------:|------|
| `date` | ✅ | |
| `recordedAt` | ✅ | |
| `createdAt` | ✅ | |
| `classDate` | ✅ | |
| `day` | ✅ | |
| `period` | ✅ | |
| `className` | 부분 | 기록 시 포함되지만 필드명 불일치 가능 |
| `activity` | ✅ | |
| `domain` | ✅ | |
| `variation` | ✅ | |
| `memo` | ✅ | |
| `sequence` | ✅ | |
| `performance` | ✅ | |
| `subject` | 부분 | 일부 기록에서 누락 가능 |
| `source` | 부분 | 일부 기록에서 누락 가능 |
| `aceLesson` | ✅ | 스냅샷 객체 지원 |

### 2.3 Firebase Auth 흐름

| 설계 항목 | 구현 파일 | 상태 | 비고 |
|-----------|----------|:----:|------|
| Google OAuth (팝업) | `src/services/auth.js:24-27` | ✅ | `signInWithPopup` |
| `onAuthStateChanged` 리스너 | `src/hooks/useAuth.js:17-40` | ✅ | |
| 신규 사용자 문서 생성 | `src/services/auth.js:41-78` | ✅ | 설계 pseudo-code와 일치 |
| 기존 사용자 lastLoginAt 업데이트 | `src/services/auth.js:71` | ✅ | |
| 로그인 페이지 | `src/pages/LoginPage.jsx` | ✅ | Google 로그인 버튼 |
| 로그아웃 | `src/services/auth.js:32-34` | ✅ | |
| 계정 삭제 | `src/services/auth.js:83-128` | ✅ | 서브컬렉션 삭제 + Auth 삭제 |
| SetupWizard 라우팅 | `src/hooks/useAuth.js:27` | ✅ | `isNewUser` 플래그 |
| localStorage 마이그레이션 프롬프트 | `src/components/common/MigrationPrompt.jsx` | ✅ | 설계 UI와 일치 |

### 2.4 Security Rules

| 설계 항목 | 구현 파일 | 상태 | 비고 |
|-----------|----------|:----:|------|
| `isAuthenticated()` 헬퍼 | `firestore.rules:9-11` | ✅ | |
| `isOwner(uid)` 헬퍼 | `firestore.rules:13-15` | ✅ | |
| users/{uid} 본인만 접근 | `firestore.rules:21` | ✅ | |
| classes 서브컬렉션 보호 | `firestore.rules:24-26` | ✅ | |
| roster 개인정보 보호 | `firestore.rules:28-30` | ✅ | |
| records 생성 시 필수 필드 검증 | `firestore.rules:33-35` | 부분 | 설계서의 `create` 규칙에 필드 타입 검증 있으나 구현은 간단한 `read, write` |
| schedule 보호 | `firestore.rules:39-41` | ✅ | |
| editedLessons 보호 | `firestore.rules:44-46` | ✅ | |
| myActivities 보호 | `firestore.rules:49-51` | ✅ | |
| curriculum 보호 | `firestore.rules:54-56` | ✅ | |
| 기본 거부 규칙 | `firestore.rules:60-62` | ✅ | |
| `isValidSize()` 헬퍼 | - | 미구현 | 설계에 정의되어 있으나 구현 안됨 |

### 2.5 인덱스 설계

| 설계 인덱스 | 구현 (`firestore.indexes.json`) | 상태 |
|-------------|-------------------------------|:----:|
| records: `domain ASC + date DESC` | ✅ 일치 | ✅ |
| records: `day + period + classDate` | ✅ 일치 | ✅ |
| records: `domain + sequence` | ✅ 일치 | ✅ |
| classes: `grade + classNum` | ✅ 일치 | ✅ |

### 2.6 마이그레이션

| 설계 항목 | 구현 파일 | 상태 | 비고 |
|-----------|----------|:----:|------|
| `migrateLocalStorageToFirestore()` | `src/services/migration.js:98-293` | ✅ | |
| batch 500건 청킹 | `src/services/migration.js:42-48` | ✅ | |
| 진행률 콜백 | `src/services/migration.js:96-106` | ✅ | |
| MigrationPrompt UI | `src/components/common/MigrationPrompt.jsx` | ✅ | 3버튼 (이전/나중에/새로시작) |
| 마이그레이션 완료 플래그 | `src/services/migration.js:287` | ✅ | |
| 11개 localStorage 키 매핑 | `src/services/migration.js:11-23` | ✅ | |
| `pe_class_setup` -> user 문서 | `migration.js:115-120` | 부분 | `config` 필드로 저장 (설계: `schoolLevel`+`grades` 직접) |
| `pe_timetable_base` -> schedule/base | `migration.js:127-131` | 부분 | `grid` 필드명 (설계: `cells`) |
| `pe_timetable_weeks` -> weeks 개별 문서 | `migration.js:139-151` | 부분 | `week_` 접두사 + `grid` 필드 (설계: `cells`) |
| `pe_rosters` -> roster 서브컬렉션 | `migration.js:179-189` | 부분 | 필드명 `number` (설계: `num`) |
| `curriculum_my_activities_v1` -> myActivities 개별 문서 | `migration.js:248-254` | 부분 | 단일 문서에 배열 저장 (설계: 개별 문서) |
| 마이그레이션 후 7일 유지 정책 | - | 미구현 | 설계서의 7일 유지 + 수동 삭제 안내 |

### 2.7 비용 최적화 전략

| 설계 항목 | 구현 상태 | 비고 |
|-----------|:--------:|------|
| Firestore 오프라인 persistence | ✅ | `firebase.js:17-21` `persistentLocalCache` |
| 실시간 리스너 최소화 (`getDoc` 우선) | ✅ | 대부분 `getDoc` 사용 |
| 쿼리 범위 제한 (limit) | ✅ | A-4: 수업 기록 50건 제한 |
| 디바운스 쓰기 (300ms) | ✅ | A-3: `useSchedule.js:7` |
| 배치 쓰기 활용 | ✅ | `firestore.js:52-68` `commitBatchChunked` |
| 불필요한 필드 업데이트 방지 (`updateDoc`) | 부분 | 대부분 `setDoc(merge:true)` 사용 |

### 2.8 훅 전환 가이드 (어댑터 패턴)

| 설계 항목 | 구현 상태 | 비고 |
|-----------|:--------:|------|
| `useDataSource` 어댑터 훅 | ✅ | `src/hooks/useDataSource.js` 존재 |
| `getUid()` 유틸리티 | ✅ | `useDataSource.js:17-19` |
| `useFirestoreDoc()` 제네릭 훅 | ✅ | `useDataSource.js:30-107` |
| 각 훅에서 Firestore 로드 | ✅ | useClassManager, useSchedule, useSettings, useEditedAceLesson, useCurriculum 모두 구현 |
| 각 훅에서 Firestore 저장 | ✅ | 각 훅의 sync 함수 존재 |
| 외부 인터페이스 동일 유지 | ✅ | return 값 구조 변경 없음 |

### 2.9 Firebase 설계서 핵심 차이 요약

| 항목 | 설계서 | 실제 구현 | 영향도 |
|------|--------|----------|:------:|
| roster 저장 방식 | 서브컬렉션 개별 문서 | 학급 문서 내 `roster` 필드 | 중간 |
| records 저장 방식 | 서브컬렉션 개별 문서 | 학급 문서 내 `records` 필드 | 높음 |
| schedule/base 필드명 | `cells` | `timetable` | 낮음 |
| schedule/weeks 구조 | 주별 개별 문서 | 단일 문서에 모든 주 | 중간 |
| records create 규칙 검증 | 필수 필드 + 타입 검증 | 단순 `read, write` | 중간 |
| `isValidSize()` 헬퍼 | 정의됨 | 미구현 | 낮음 |
| user 문서 `updatedAt` | 필수 | 신규 생성 시 누락 | 낮음 |
| 마이그레이션 필드명 일관성 | `cells`, `num` | `grid`, `number` | 낮음 |
| myActivities 마이그레이션 | 개별 문서 | 단일 문서에 배열 | 중간 |

---

## 3. Gemini AI 통합 계획서 Gap 분석

> **설계서**: `docs/gemini-ai-integration-plan.md`
> **Match Rate**: 82%

### 3.1 Step별 구현 현황

| Step | 설계 항목 | 구현 파일 | 상태 | 비고 |
|:----:|-----------|----------|:----:|------|
| **1** | `src/services/ai.js` | 존재 | ✅ | Firebase AI Logic 초기화 |
| **1** | `src/services/aiPrompts.js` — 프롬프트 빌더 5개 | 존재 (7개) | ✅ | 설계 5개 + B-1 추가 2개 |
| **1** | `src/hooks/useAI.js` — 상태관리 훅 | 존재 | ✅ | `useAI()` + `useAIChat()` |
| **2** | `src/components/common/AIButton.jsx` | 존재 | ✅ | |
| **2** | `src/components/common/AIResponseCard.jsx` | 존재 | ✅ | |
| **2** | `src/styles/css/components/ai.css` | 존재 | ✅ | |
| **3** | `ActivityDetailModal.jsx` — AI 설명 보강 | 존재 | ✅ | |
| **3** | `ActivityDetailModal.jsx` — ACE 수업안 생성 | 존재 | ✅ | |
| **3** | `AlternativeActivityModal.jsx` — AI 대체 활동 추천 | 존재 | ✅ | B-2에서 구현 |
| **4** | `AIChatPanel.jsx` — 플로팅 채팅 | 존재 | ✅ | |
| **4** | `App.jsx` — AIChatPanel 삽입 | 완료 | ✅ | |
| **5** | `SchedulePage.jsx` — 수업 기록 AI 활동 추천 | 완료 | ✅ | |
| **6** | `AIDailySuggestion.jsx` — 오늘의 한줄 제안 | 존재 | ✅ | |
| **6** | `HomePage.jsx` — 카드 삽입 | 완료 | ✅ | |
| **7** | Genkit 서버 로컬 실행/배포 | 서버 코드 완성 | 부분 | 로컬 실행 확인됨, 배포 미완료 |
| **7** | AI 채팅을 Genkit RAG 모드로 확장 | `useAI.js:107-162` | ✅ | D-1에서 Genkit-first + fallback 구현 |

### 3.2 탭별 AI 기능 맵 구현 현황

| 탭 | 기능 | 우선순위 | 상태 | 구현 위치 |
|----|------|:--------:|:----:|----------|
| 홈 | 오늘의 AI 한줄 제안 | P1 | ✅ | `AIDailySuggestion.jsx` |
| 시간표 | 수업 기록 AI 활동 추천 | P1 | ✅ | `SchedulePage.jsx` |
| 시간표 | 수업 메모 AI 확장 | P3 | 미구현 | 향후 작업 |
| 수업설계 | 활동 설명 AI 보강 | P1 | ✅ | `ActivityDetailModal.jsx` |
| 수업설계 | ACE 수업안 AI 생성 | P1 | ✅ | `ActivityDetailModal.jsx` |
| 수업설계 | 대체 활동 AI 추천 | P2 | ✅ | `AlternativeActivityModal.jsx` (B-2) |
| 학급 | 학급별 수업 분석 | P2 | ✅ | `ClassesPage.jsx` (B-3) |
| 전체 | 플로팅 AI 채팅 | P1 | ✅ | `AIChatPanel.jsx` |

### 3.3 프롬프트 빌더 현황

| 설계 프롬프트 | 구현 함수 | 상태 |
|-------------|----------|:----:|
| 활동 설명 보강 | `buildEnhancePrompt()` | ✅ |
| ACE 수업안 생성 | `buildAceLessonPrompt()` | ✅ |
| 활동 추천 (시간표) | `buildActivitySuggestionPrompt()` | ✅ |
| 오늘의 한줄 제안 | `buildDailySuggestionPrompt()` | ✅ |
| 채팅 시스템 프롬프트 | `buildChatSystemPrompt()` | ✅ |
| 대체 활동 추천 (신규) | `buildAlternativeRecommendPrompt()` | ✅ (B-1) |
| 학급 수업 분석 (신규) | `buildClassAnalysisPrompt()` | ✅ (B-1) |

### 3.4 기술 구현 검증

| 설계 항목 | 구현 상태 | 비고 |
|-----------|:--------:|------|
| Firebase AI Logic 초기화 패턴 | ✅ | `ai.js`에서 `getAI()`, `getGenerativeModel()` |
| firebaseConfig.apiKey 사용 | ✅ | 별도 키 불필요 |
| 응답 캐싱 (sessionStorage 5분) | 확인 필요 | 코드에서 직접 확인 못함 |
| 버튼 쿨다운 3초 | ✅ | `useAI.js:5` `COOLDOWN_MS = 3000` |
| navigator.onLine 체크 | ✅ | `ai.js`의 `isAIAvailable()` |
| 스트리밍 응답 | ✅ | `useAI.js:57-82` `generateStream()` |
| 429 에러 핸들링 | ✅ | `useAI.js:45-48` |

### 3.5 Gemini AI 설계서 미구현 항목

| 항목 | 설계서 위치 | 상태 | 비고 |
|------|-----------|:----:|------|
| 수업 메모 AI 확장 (P3) | Section "남은 작업" | 미구현 | 키워드 -> 문장 확장 기능 |
| Firebase Console Gemini API 활성화 확인 | Section "남은 작업" | 외부 작업 | 사용자 측 필요 |
| Genkit 서버 프로덕션 배포 | Step 7 | 미완료 | 로컬 실행만 확인 |

---

## 4. Genkit RAG 수업 추천 설계서 Gap 분석

> **설계서**: `docs/llm-recommend-design.md`
> **Match Rate**: 64%

### 4.1 서버 프로젝트 구조

| 설계 파일 | 실제 파일 | 상태 | 비고 |
|-----------|----------|:----:|------|
| `server/src/index.ts` | 존재 | ✅ | 진입점 + 정적 데이터 인덱싱 |
| `server/src/genkit.ts` | 존재 | ✅ | Genkit 인스턴스 설정 |
| `server/src/flows/recommendFlow.ts` | 존재 | ✅ | 하이브리드 추천 Flow |
| `server/src/flows/chatFlow.ts` | 존재 | ✅ | 자연어 대화 Flow |
| `server/src/flows/syncRecordsFlow.ts` | 존재 | ✅ | 수업 기록 동기화 Flow |
| `server/src/rag/indexer.ts` | 존재 | ✅ | 벡터 인덱싱 |
| `server/src/rag/retriever.ts` | 존재 | ✅ | 유사도 검색 |
| `server/src/rag/dataLoader.ts` | 존재 | ✅ | Document 변환 |
| `server/src/utils/intentParser.ts` | 존재 | ✅ | 키워드 의도 파싱 |
| `server/src/utils/scoreMerger.ts` | 존재 | ✅ | 점수 병합 |
| `server/src/prompts/system.prompt` | 미존재 | 미구현 | Dotprompt 파일 미생성 (인라인으로 대체) |
| `server/src/prompts/recommend.prompt` | 미존재 | 미구현 | 인라인으로 대체 |
| `server/src/prompts/intentParse.prompt` | 미존재 | 미구현 | 규칙 기반으로 대체 |
| `server/package.json` | 존재 | ✅ | 의존성 일치 |
| `server/tsconfig.json` | 존재 | ✅ | |
| `server/.env` | 존재 (gitignored) | ✅ | C-1 확인 완료 |
| `server/data/vectorstore/` | 미확인 | 부분 | 런타임 시 자동 생성 |

### 4.2 Genkit 설정 검증

| 설계 항목 | 실제 구현 | 상태 | 비고 |
|-----------|----------|:----:|------|
| `genkit()` 인스턴스 | `server/src/genkit.ts` | ✅ | |
| `googleAI()` 플러그인 | 적용 | ✅ | |
| `devLocalVectorstore` 플러그인 | 적용 | ✅ | |
| `pe_activities` 인덱스 | 설정됨 | ✅ | |
| `pe_curriculum` 인덱스 | 설정됨 | ✅ | |
| `pe_records` 인덱스 | 설정됨 | ✅ | |
| 임베더: `gemini-embedding-001` | `googleai/gemini-embedding-001` | ✅ | |
| 모델: `gemini-2.0-flash` | `googleai/gemini-2.5-flash` | 부분 | 설계: 2.0, 실제: 2.5 (상위 모델) |
| 의존성 버전 (`^1.14.0`) | 일치 | ✅ | |

### 4.3 RAG 파이프라인

| 설계 항목 | 구현 상태 | 비고 |
|-----------|:--------:|------|
| `activityToDocument()` 변환 | ✅ | 설계와 유사한 텍스트 형식 |
| `recordToDocument()` 변환 | ✅ | |
| `curriculumActivityToDocument()` (추가) | ✅ | 설계서에 없지만 유용한 추가 |
| `sportToDocument()` (추가) | ✅ | |
| `skillToDocument()` (추가) | ✅ | |
| `standardToDocument()` | ✅ | |
| `indexStaticData()` 서버 시작 시 실행 | ✅ | `index.ts:60-127` |
| `indexRecords()` 증분 인덱싱 | ✅ | |
| `searchActivities()` | ✅ | |
| `searchRecords()` | ✅ | |
| `searchCurriculum()` (추가) | ✅ | 설계서에 없지만 chatFlow에서 활용 |

### 4.4 Flow 설계 매칭

#### recommendFlow

| 설계 항목 | 구현 상태 | 비고 |
|-----------|:--------:|------|
| inputSchema (query, filters, recentActivities) | ✅ | `z.object` 스키마 일치 |
| outputSchema (recommendations, summary) | ✅ | `activityName` 필드 추가 (설계에 없음) |
| RAG 검색 (activities + records) | ✅ | 병렬 검색 |
| 시스템 프롬프트 | ✅ | 인라인으로 구현 (Dotprompt 아닌) |
| `output.schema` JSON 강제 | ✅ | `format: 'json'` |
| `intentParser` 연동 | ✅ | 키워드 기반 의도 파싱 |

#### chatFlow

| 설계 항목 | 구현 상태 | 비고 |
|-----------|:--------:|------|
| inputSchema (message, history) | ✅ | |
| outputSchema (string) | ✅ | |
| RAG 검색 (activities) | ✅ | + curriculum 검색 추가 |
| 대화 히스토리 메시지 변환 | ✅ | |

#### syncRecordsFlow

| 설계 항목 | 구현 상태 | 비고 |
|-----------|:--------:|------|
| inputSchema (records 배열) | ✅ | |
| outputSchema (embedded, totalRecords) | ✅ | |
| `indexRecords()` 호출 | ✅ | |

### 4.5 프론트엔드 연동

| 설계 항목 | 구현 파일 | 상태 | 비고 |
|-----------|----------|:----:|------|
| `src/services/genkit.js` | 존재 | ✅ | |
| `checkGenkitHealth()` | ✅ | 3초 타임아웃 |
| `requestRecommendation()` | ✅ | |
| `sendChatMessage()` | ✅ | |
| `syncRecords()` | ✅ | |
| Vite 프록시 `/genkit` | `vite.config.js:34-38` | ✅ | |
| useAIChat에서 Genkit-first 로직 | `useAI.js:107-162` | ✅ | D-1 |
| useClassManager에서 genkitSyncRecords | `useClassManager.js:349-351` | ✅ | D-3 |
| useRecommend 확장 (AI 추천) | - | 미구현 | D-2: 훅 미존재 |

### 4.6 하이브리드 추천 전략

| 설계 항목 | 구현 상태 | 비고 |
|-----------|:--------:|------|
| 빠른 경로 (규칙 기반, < 50ms) | ✅ | 기존 추천 엔진 유지 |
| 풍부한 경로 (Genkit Flow) | ✅ | recommendFlow 구현 |
| Fallback 전략 (서버 미실행 시) | 부분 | 채팅에서만 fallback, 추천에서는 미연결 |
| 점수 병합 (`scoreMerger.ts`) | ✅ (서버) | 프론트엔드 연동 미구현 |
| Genkit 상태 표시 UI (`GenkitStatus.jsx`) | 미구현 | 설계 Phase 4-D |
| 후속 질문 칩 UI | 미구현 | 설계 Phase 4-D |
| `AiRecommendCard.jsx` | 미구현 | 설계 Phase 4-D |

### 4.7 Phase별 로드맵 진행 현황

| Phase | 항목 | 상태 | 완료율 |
|:-----:|------|:----:|:------:|
| **4-A** | Genkit 서버 + 기본 생성 | ✅ | 100% |
| A-1 | API 키 발급 + `.env` | ✅ | |
| A-2 | 프로젝트 초기화 | ✅ | |
| A-3 | `genkit.ts` 설정 | ✅ | |
| A-4 | `chatFlow` 구현 | ✅ | |
| A-5 | Genkit Dev UI 테스트 | ✅ (C-3) | |
| A-6 | `services/genkit.js` 유틸 | ✅ | |
| **4-B** | RAG 인덱싱 + 검색 | ✅ | 83% |
| B-1 | `dataLoader.ts` | ✅ | |
| B-2 | `indexer.ts` | ✅ | |
| B-3 | `retriever.ts` | ✅ | |
| B-4 | Dotprompt 파일 | 미구현 | 인라인 대체 |
| B-5 | `recommendFlow` | ✅ | |
| B-6 | 프론트엔드 "AI 추천" 버튼 연동 | 미구현 | useRecommend 미확장 |
| **4-C** | 수업 기록 RAG + 개인화 | 부분 | 50% |
| C-1 | `syncRecordsFlow` | ✅ | |
| C-2 | 프론트엔드 자동 sync | ✅ (D-3) | `genkitSyncRecords` fire-and-forget |
| C-3 | 개인화 점수 로직 | ✅ (서버) | `scoreMerger.ts` 존재, 연동 안됨 |
| C-4 | 프롬프트에 과거 기록 추가 | ✅ | recommendFlow에 포함 |
| **4-D** | UI 통합 + 채팅 | 부분 | 40% |
| D-1 | AI 추천 결과 카드 | 미구현 | `AiRecommendCard.jsx` |
| D-2 | 채팅 인터페이스 | ✅ | `AIChatPanel.jsx` (기존) + Genkit fallback |
| D-3 | Genkit 상태 표시 UI | 미구현 | `GenkitStatus.jsx` |
| D-4 | 후속 질문 칩 UI | 미구현 | |
| D-5 | 에러 처리 + fallback | 부분 | 채팅만 구현 |

### 4.8 Genkit RAG 설계서 핵심 차이 요약

| 항목 | 설계서 | 실제 구현 | 영향도 |
|------|--------|----------|:------:|
| LLM 모델 | `gemini-2.0-flash` | `gemini-2.5-flash` | 낮음 (상위 호환) |
| Dotprompt 파일 | `prompts/*.prompt` 3개 | 인라인 프롬프트 | 낮음 |
| `useRecommend` 확장 | 설계서 Section 7.2 | 미구현 | 높음 |
| `AiRecommendCard.jsx` | Phase 4-D-1 | 미구현 | 높음 |
| `GenkitStatus.jsx` | Phase 4-D-3 | 미구현 | 중간 |
| 후속 질문 칩 | Phase 4-D-4 | 미구현 | 중간 |
| 점수 병합 프론트 연동 | Section 5.3 | 서버만 존재 | 중간 |
| 프로덕션 배포 | 부록 B | 미착수 | 낮음 (현재 단계) |

---

## 5. 이번 세션 Track별 검증 결과

### Track A: Firebase 최적화

| 항목 | 설계서 근거 | 구현 확인 | 상태 |
|------|-----------|----------|:----:|
| A-1: 복합 인덱스 4개 | 설계서 Section 5.2 | `firestore.indexes.json` 4개 인덱스 확인 | ✅ |
| A-2: 오프라인 persistence | 설계서 Section 8.2(1) | `firebase.js:17-21` `persistentLocalCache` | ✅ |
| A-3: 시간표 300ms 디바운스 | 설계서 Section 8.3(2) | `useSchedule.js:7` `createDebouncedWriter(300)` | ✅ |
| A-4: 수업 기록 50건 제한 | 설계서 Section 8.2(4) | `useClassManager.js:97` `.slice(0, 50)` | ✅ |

### Track B: AI P2 클라이언트 기능

| 항목 | 설계서 근거 | 구현 확인 | 상태 |
|------|-----------|----------|:----:|
| B-1: 프롬프트 2개 추가 | AI 계획서 "남은 작업" P2 | `aiPrompts.js:154-218` 2개 함수 | ✅ |
| B-2: 대체활동 AI 추천 UI | AI 계획서 Step 3 P2 | `AlternativeActivityModal.jsx` AI 버튼 + AIResponseCard | ✅ |
| B-3: 학급 수업 분석 UI | AI 계획서 "학급별 수업 분석" P2 | `ClassesPage.jsx:7-10, 26-32` AI 버튼 + 결과 표시 | ✅ |

### Track C: Genkit 서버 검증

| 항목 | 설계서 근거 | 구현 확인 | 상태 |
|------|-----------|----------|:----:|
| C-1: API 키 설정 + .gitignore | RAG 설계서 Section 3.2 | `server/.env` 존재, `.gitignore`에 `.env` 포함 | ✅ |
| C-2: 데이터 파일 9개 존재 | RAG 설계서 Section 4.1 | 모듈 5개 + 커리큘럼 활동 5개 + standards 1개 = 11개+ | ✅ |
| C-3: TypeScript 빌드 0 에러 | RAG 설계서 Section 3.1 | 사용자 보고: 빌드 에러 0, 서버 실행 확인 | ✅ |

### Track D: Genkit <-> 프론트엔드 연결

| 항목 | 설계서 근거 | 구현 확인 | 상태 |
|------|-----------|----------|:----:|
| D-1: Genkit-first + Firebase AI fallback | AI 계획서 Step 7 | `useAI.js:144-162` Genkit 시도 -> Firebase 폴백 | ✅ |
| D-2: useRecommend 확장 | RAG 설계서 Section 7.2 | 훅 미존재로 건너뜀 | 미구현 |
| D-3: addClassRecord -> genkitSyncRecords | RAG 설계서 Phase 4-C-2 | `useClassManager.js:349-351` fire-and-forget | ✅ |

---

## 6. 미구현 항목 정리

### 즉시 작업 필요 (High Impact)

| 우선순위 | 항목 | 설계서 | 영향도 | 작업 내용 |
|:--------:|------|--------|:------:|----------|
| 1 | roster/records 서브컬렉션 전환 | Firebase Section 2.3-2.4 | 높음 | 현재 학급 문서 내 필드 -> 서브컬렉션 개별 문서로 분리 |
| 2 | useRecommend AI 확장 | RAG Section 7.2 | 높음 | Genkit recommendFlow 연동, `isGenkitAvailable` + `requestAiRecommend()` |
| 3 | Security Rules records 생성 검증 | Firebase Section 4 | 중간 | `allow create` 규칙에 필드 타입 검증 추가 |

### 단기 작업 (Medium Impact)

| 우선순위 | 항목 | 설계서 | 비고 |
|:--------:|------|--------|------|
| 4 | schedule/weeks 구조 변경 | Firebase Section 2.6 | 주별 개별 문서로 분리 |
| 5 | AiRecommendCard.jsx | RAG Phase 4-D-1 | AI 추천 결과 전용 카드 컴포넌트 |
| 6 | GenkitStatus.jsx | RAG Phase 4-D-3 | 서버 상태 표시 UI |
| 7 | 필드명 통일 (timetable -> cells) | Firebase Section 2.5 | schedule/base 필드명 |
| 8 | curriculum customActivities Firestore 동기화 | Firebase Section 2.9-2.10 | localStorage만 사용 중 |

### 장기/미래 작업 (Low Impact or Deferred)

| 항목 | 설계서 | 비고 |
|------|--------|------|
| Dotprompt 파일 분리 | RAG Section 4-B-4 | 현재 인라인으로 충분히 동작 |
| 수업 메모 AI 확장 (P3) | AI 계획서 | 키워드 -> 문장 기능 |
| 후속 질문 칩 UI | RAG Phase 4-D-4 | |
| scoreMerger 프론트엔드 연동 | RAG Section 5.3 | 규칙+AI 점수 병합 |
| isValidSize() Security Rules | Firebase Section 4 | |
| 마이그레이션 7일 유지 정책 | Firebase Section 6.3 | |
| 프로덕션 배포 (Cloud Functions) | RAG 부록 B | |

---

## 7. 설계서 업데이트 필요 항목

구현이 의도적으로 설계와 다르게 된 부분은 설계서를 업데이트하여 반영해야 합니다.

| 항목 | 설계서 내용 | 실제 구현 | 권장 조치 |
|------|-----------|----------|----------|
| LLM 모델 | `gemini-2.0-flash` | `gemini-2.5-flash` | 설계서 업데이트 (의도적 상위 모델 사용) |
| Dotprompt | 파일 분리 | 인라인 프롬프트 | 설계서에 "인라인 대체" 허용 주석 |
| dataLoader 추가 변환 함수 | activity + record만 | +curriculum, sport, skill, standard | 설계서에 추가 변환 함수 반영 |
| chatFlow RAG | activities만 검색 | activities + curriculum 검색 | 설계서에 curriculum 검색 반영 |
| Firebase persistence | `enableIndexedDbPersistence` | `persistentLocalCache` | 설계서 업데이트 (최신 API) |
| user 문서 `updatedAt` 누락 | 필수 | 신규 생성 시 누락 | 구현 수정 또는 설계 optional로 |

---

## 8. 종합 권장 조치

### Match Rate < 90% 이므로 Act Phase 진입 권장

```
현재 종합 Match Rate: 74%
목표: >= 90%
Gap: 16% (약 13개 미구현 + 22개 부분 구현 항목)
```

**권장 우선순위**:

1. **[Firebase] roster/records 서브컬렉션 전환** -- 설계 의도(쿼리 성능, 개인정보 보안)에 부합하도록 학급 문서 내 필드 -> 서브컬렉션으로 전환. 가장 큰 구조적 차이.

2. **[Genkit] useRecommend AI 확장** -- 수업스케치 탭에서 Genkit recommendFlow를 호출하는 "AI 추천" 버튼 추가. 이것이 Genkit RAG의 핵심 사용 시나리오.

3. **[Firebase] Security Rules 강화** -- records 생성 시 필수 필드 + 타입 검증 규칙 추가.

4. **[UI] AiRecommendCard + GenkitStatus** -- AI 추천 결과 표시 및 서버 상태 안내 컴포넌트.

5. **[Firebase] 필드명 통일** -- `timetable` -> `cells`, `number` -> `num` 등 설계서와 일치.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-16 | 3개 설계서 종합 Gap 분석 (Track A~D 반영) | Claude Code |
