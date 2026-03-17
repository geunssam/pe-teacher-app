# YouTube 1,405개 영상 구조화 + PEHub Genkit 임베딩 계획

## Context
양수쌤체육수업 YouTube 1,405개 영상을 Ollama(Qwen3-30B-A3B)로 구조화 추출하고, PEHub Genkit 벡터스토어에 임베딩하여 AI 채팅에서 활동 검색·변형·ACE 수업 설계가 가능하도록 한다.

**이미 완료된 작업:**
- Phase 1 크롤링 완료 → `data/raw/videos.json` (1,405개)
- Ollama + Qwen3-30B-A3B (18GB) 설치 완료
- chatFlow.ts 시스템 프롬프트에 ACE 체육 모형 반영 완료
- 샘플 10개 Ollama 구조화 테스트 성공
- Phase 3 서버 코드 구현 완료 (genkit.ts, dataLoader.ts, indexer.ts, retriever.ts, ingestYouTubeFlow.ts)

---

## Step 1: structure.py 프롬프트 + JSON 스키마 확장

**파일:** `scripts/youtube-crawler/structure.py`

### 신규 10개 필드 추가

| 필드 | 타입 | 설명 |
|------|------|------|
| `team_format` | string | 인원/팀 구성 ("2팀 대항", "짝 활동", "개인", "모둠") |
| `tags` | string[] | 검색 키워드 5-8개 |
| `movements` | string[] | 기본 움직임 (이동/비이동/조작 하위: 던지기, 달리기, 잡기 등) |
| `game_structure` | string | 게임 핵심 메커닉 ("패스 릴레이", "진영 점령", "태그" 등) |
| `similar_activities` | string[] | 유사 활동명/동의어 |
| `situations` | string[] | 활용 상황 ("비오는 날", "준비물 없이", "5분 게임" 등) |
| `difficulty` | string | "쉬움" / "보통" / "어려움" |
| `duration` | string | 예상 소요 시간 ("5분", "10분", "20분", "한 차시") |
| `values` | string[] | 핵심 가치 ("협력", "경쟁", "배려", "자기극복" 등) |
| `modifications` | string[] | 변형 팁 ("공 개수 늘리기", "코트 줄이기" 등) |

### 수정 내용
1. `OLLAMA_JSON_SCHEMA`에 10개 필드 추가
2. `EXTRACTION_PROMPT`에 신규 필드별 추출 규칙 추가
3. 기존 `data/structured/` 리셋 (이미 완료)

---

## Step 2: dataLoader.ts 임베딩 텍스트 확장

**파일:** `server/src/rag/dataLoader.ts`

### 2-1. YouTubeVideo 인터페이스 확장 (line 112-128)
activity 객체에 신규 필드 10개 추가 (모두 optional)

### 2-2. youtubeVideoToDocument() 임베딩 텍스트 확장 (line 130-168)
기존 텍스트 뒤에 신규 필드 추가:
```
인원 구성: {team_format}
게임 구조: {game_structure}
기본 움직임: {movements}
유사 활동: {similar_activities}
활용 상황: {situations}
난이도: {difficulty}
소요 시간: {duration}
핵심 가치: {values}
변형 팁: {modifications}
태그: {tags}
```

### 2-3. 메타데이터에 difficulty, teamFormat 추가

---

## Step 3: 전체 구조화 실행

**명령어:** `uv run python -u structure.py`

- 모델: Ollama qwen3:30b-a3b (로컬, rate limit 없음)
- JSON 스키마 강제, temperature 0
- 20개마다 자동 저장 (progress.json 기반 이어하기 가능)
- 예상: 2-4시간 (백그라운드 실행)

---

## Step 4: PEHub 서버 인제스트

### 4-1. 서버 시작
```bash
cd ~/Desktop/PEhub/server && pnpm dev  # localhost:3400
```

### 4-2. 인제스트 실행
```bash
cd ~/Desktop/PEhub/scripts/youtube-crawler && uv run python ingest.py
```

- is_pe_activity=true만 필터 → 20개씩 배치 POST
- 서버에서 Gemini embedding → pe_youtube 벡터스토어
- 예상: ~20분

---

## Step 5: 검증

### 5-1. 구조화 뷰어 (localhost:8080/viewer.html)
- activities.json을 카드로 표시, 필터+검색, 진행률 바
- viewer.html의 배열 처리 버그 수정 (suitable_grades, space)
- 신규 필드(태그, 난이도 등) 표시 추가

### 5-2. PEHub AI 채팅 테스트 (localhost:5176)
테스트 질문:
- "피구 변형 활동 추천해줘"
- "축구 리더패스를 농구로 바꿔줘"
- "비오는 날 실내 활동"
- "3학년 스포츠 영역 Acquire-Challenge-Engage 수업 설계해줘"
→ ACE 단계 명시 + YouTube 영상 참고하여 답변하는지 확인

### 5-3. 샘플 5개 수동 검토
- 태그, 게임 구조, 기본 움직임, 변형 팁이 정확한지 확인

---

## 수정 파일 요약

| # | 파일 | 변경 |
|---|------|------|
| 1 | `scripts/youtube-crawler/structure.py` | 프롬프트 + JSON 스키마에 10개 신규 필드 |
| 2 | `server/src/rag/dataLoader.ts` | YouTubeVideo 인터페이스 + 임베딩 텍스트 확장 |
| 3 | `server/src/flows/chatFlow.ts` | ACE 모형 시스템 프롬프트 **(이미 완료)** |

## 데이터 저장 경로

```
scripts/youtube-crawler/
├── data/raw/
│   ├── videos.json          ← Phase 1 크롤링 원본 (1,405개, ~29MB)
│   ├── progress.json        ← 크롤링 진행 상황
│   └── errors.json          ← 크롤링 실패 목록
├── data/structured/
│   ├── activities.json      ← Phase 2 구조화 결과 (Ollama 출력)
│   └── progress.json        ← 구조화 진행 상황
└── PLAN.md                  ← 이 계획서

server/.genkit/
└── pe_youtube.json          ← Genkit 벡터스토어 (임베딩된 검색 데이터)
```

---

## 향후 확장: pe_knowledge → pe_lessons 구조화

### 현재 벡터스토어 구조

| 벡터스토어 | 용도 | 데이터 형태 | 검색 정밀도 |
|-----------|------|-----------|------------|
| pe_activities | 교육과정 활동 DB | 구조화 JSON | 높음 |
| pe_curriculum | 성취기준 | 구조화 JSON | 높음 |
| pe_knowledge | 교사 업로드 문서 | **텍스트 청크 (비구조)** | 보통 |
| pe_youtube | YouTube 영상 | **구조화 JSON (19필드)** | 높음 |

### 문제점
`pe_knowledge`에 수업지도안 PDF를 넣으면 텍스트 덩어리로만 저장됨.
→ "피구"로 검색은 되지만, "3학년 실내 짝 활동 Acquire용"처럼 **조건 조합 검색**은 약함.

### 확장 계획: pe_lessons 벡터스토어 신설

**목적:** 수업지도안, 다른 채널 영상, 교사 자료를 YouTube와 동일한 정밀도로 검색

**구조화 필드 (pe_youtube와 동일 패턴):**
```
활동명, 단원명, 성취기준 코드, ACE 단계, 학년, 종목,
게임 구조, 기본 움직임, 장소, 준비물, 난이도,
태그, 핵심 가치, 변형 팁, 출처 (PDF/영상/문서)
```

**구현 방식:**
1. `server/src/genkit.ts`에 `pe_lessons` 인덱스 추가
2. `dataLoader.ts`에 `LessonPlan` 인터페이스 + `lessonToDocument()` 추가
3. `indexer.ts`에 `indexLessons()` 추가
4. `retriever.ts`에 `searchLessons()` 추가
5. `chatFlow.ts`에 5번째 병렬 검색 추가

**입력 소스:**
- 교사가 올린 PDF → Ollama로 구조화 추출 → pe_lessons에 임베딩
- 다른 YouTube 채널 → 같은 crawl→structure→ingest 파이프라인 사용
- 직접 입력한 수업 기록 → PEHub UI에서 바로 구조화 저장

**기대 효과:**
- 모든 수업 자료가 같은 정밀도로 검색됨
- "축구 리더패스를 농구로 바꿔줘" → YouTube + 수업지도안 + 교육과정 모두 동시 검색
- chatFlow가 5개 서랍을 동시에 뒤져서 최적의 답변 생성

---

## 예상 소요

| 단계 | 코딩 | 실행 |
|------|------|------|
| Step 1-2: 코드 수정 | 15분 | - |
| Step 3: 전체 구조화 | - | 2-4시간 (백그라운드) |
| Step 4: 인제스트 | - | 20분 |
| Step 5: 검증 | 10분 | 10분 |
| (향후) pe_lessons 확장 | 2시간 | - |
