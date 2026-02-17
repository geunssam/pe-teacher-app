# 대화 기록 요약 - "오늘 체육 뭐하지?" 개발 과정

> 작성일: 2026-02-14
> 목적: 클로드 코드가 프로젝트 맥락을 빠르게 파악할 수 있도록 지금까지의 대화 과정을 정리

---

## 1. 프로젝트 개요

- **앱 이름**: 오늘 체육 뭐하지?
- **대상**: 초·중·고 체육교사 (초기 타겟: 초등 전담교사)
- **핵심 흐름**: 아침 날씨 확인 → 시간표로 오늘 수업 파악 → 수업스케치로 활동 선택 → 학급별 수업 기록
- **기술 스택**: React 18 + Vite 5 + Tailwind CSS 3, Firebase (Auth + Firestore), PWA
- **패키지 매니저**: pnpm

---

## 2. 개발 진행 히스토리 (커밋 순서)

### Phase 1: 프로젝트 초기 설정
- `4603cd7` - 프로젝트 초기 설정 및 네비게이션 구현
  - React + Vite + Tailwind 기본 구성
  - 5탭 네비게이션 구조: 🏠 오늘 → 🌤️ 날씨 → 📅 시간표 → ✏️ 수업스케치 → 📋 학급
  - 태블릿/데스크톱: 상단 탭바 (글래스 이펙트)
  - 모바일(<640px): 햄버거 메뉴 → 좌측 슬라이드
  - classpet 기반 라이트 테마 (크림 배경 `#FFF9F0`)

### Phase 2: 학급 관리 기능
- `8824bb4` - Step 3 & 4 구현: 학급 설정 위저드 + 간편 명단 관리
- `8534194` - 명단 에디터 저장 기능 + classpet 디자인 적용
  - useClassManager 훅으로 학급 CRUD
  - localStorage 기반 데이터 저장
  - 학급별 학생 명단 관리 (BulkImport 지원)

### Phase 3: 시간표 탭
- `632487a` - 시간표 탭 및 학급 관리 고도화
  - 요일별 7교시 시간표 그리드
  - useSchedule 훅
  - 학급-시간표 연동

### Phase 4: 날씨 + 홈 + 수업스케치
- `6e8e6dd` - 날씨·홈·수업스케치 탭 구현 완료
  - **날씨 탭**: WeatherDetail, AirQuality, HourlyForecast, OutdoorJudge 컴포넌트
  - **홈 탭**: WeatherMini (날씨 요약), TodaySchedule (오늘 시간표), RecentLessons
  - **수업스케치**: 3단계 워크플로우 (조건설정 → 후보확인 → 수업확정)
  - useRecommend 훅: 종목/학년/FMS 기반 활동 추천
  - generateCandidates 엔진: atom × modifier 랜덤 조합 → 검증 → 점수화

### Phase 5: 위치 기반 날씨 및 추천 개선
- `e9faa7a` - 위치 기반 날씨 설정 및 추천 시스템 개선
  - 학교 위치 설정으로 정확한 날씨 제공
  - 기상청 단기예보 API 연동 (초단기실황 getUltraSrtNcst)
  - 에어코리아 대기오염 API 연동 (PM10/PM2.5)
  - 좌표 → 격자 변환 (latLonToGrid)
  - 가까운 대기질 측정소 자동 탐색

### Phase 6: 수업스케치 고도화 + 배포
- `f357fc7` - 수업스케치 3단계 워크플로우 및 Netlify 배포 환경 구축
- `22cede8` - 추천 후보 생성 fallback 및 dev base path 수정
  - 후보 생성 실패 시 기존 활동 DB에서 fallback
  - Netlify 배포 설정

### Phase 7: 네이버 지도 위치 선택
- `0e65488` - 네이버 지도로 위치 선택 기능 추가
  - 네이버 지도 SDK 연동
  - 지도에서 학교 위치 클릭/검색으로 설정
  - 선택된 위치의 주소 자동 변환
  - loadNaverMapScript 유틸리티

### Phase 8: 배포 오류 수정
- `2c6032e` - Vite base 경로 수정 (Netlify 배포 오류 해결)

### Phase 9: 모듈식 체육 활동 시스템 설계
- `a2beb03` - 모듈식 체육 활동 시스템 데이터 모델 추가
- `1665ba6` - 모듈식 체육 활동 시스템 구현 명세서 작성

---

## 3. 현재 시스템 아키텍처

### 3.1 디렉토리 구조 (현재 상태)
```
src/
├── components/
│   ├── layout/        → Header, TopNav, HamburgerMenu
│   ├── home/          → WeatherMini, TodaySchedule, RecentLessons
│   ├── weather/       → WeatherDetail, AirQuality, HourlyForecast, OutdoorJudge
│   ├── schedule/      → ScheduleGrid, ScheduleEditor
│   ├── sketch/        → FilterPanel, ResultCard, VideoSection, LessonMemo
│   └── classes/       → ClassList, RosterEditor, BulkImport, HistoryView
├── pages/
│   ├── HomePage.jsx
│   ├── WeatherPage.jsx   → 실제 API 연동 완료
│   ├── SchedulePage.jsx
│   ├── SketchPage.jsx    → 3단계 워크플로우
│   ├── ClassesPage.jsx
│   ├── SettingsPage.jsx  → 위치 설정 포함
│   └── SetupWizard.jsx
├── hooks/
│   ├── useClassManager.js
│   ├── useCurrentPeriod.js
│   ├── useLocalStorage.js
│   ├── useRecommend.js     → 활동 추천 상태 관리
│   ├── useSchedule.js
│   ├── useSettings.js
│   └── useSubjects.js
├── services/
│   ├── weatherApi.js       → 기상청 + 에어코리아 API
│   └── naverLocal.js       → 네이버 지도 검색
├── data/
│   ├── activities.json     → 레거시 활동 20개 (fallback용)
│   ├── activityAtoms.json  → 기존 atom 10개 (교체 대상)
│   ├── ruleModifiers.json  → 기존 modifier 18개 (교체 대상)
│   ├── sportCoreRules.json → 기존 종목 규칙 4개 (교체 대상)
│   ├── fmsTaxonomy.json    → 기존 FMS 분류 (교체 대상)
│   ├── mockWeather.js
│   └── modules/            → ★ 새 모듈 데이터
│       ├── structures.json   → 구조 모듈 11개
│       ├── skills.json       → 기술 모듈 20개
│       ├── modifiers.json    → 변형 모듈 12개
│       ├── sports.json       → 종목 정보 9개
│       └── fmsCurriculum.json → FMS 교육과정
└── utils/
    ├── generateId.js
    ├── gridConvert.js        → 위경도 → 기상청 격자 변환
    ├── loadNaverMapScript.js
    └── recommend/
        ├── generateCandidates.js  → 498줄 (리팩터링 대상)
        ├── scoreCandidate.js      → 94줄
        ├── validateCandidate.js   → 194줄
        └── renderTemplate.js      → 44줄
```

### 3.2 외부 API 연동 상태
| API | 상태 | 비고 |
|-----|------|------|
| 기상청 단기예보 (초단기실황) | ✅ 연동 완료 | getUltraSrtNcst |
| 기상청 단기예보 (시간별) | ⚠️ Mock 사용 | getVilageFcst 코드 있지만 Mock fallback |
| 에어코리아 대기오염 | ✅ 연동 완료 | PM10/PM2.5 실시간 |
| 에어코리아 근접측정소 | ✅ 연동 완료 | 좌표 기반 자동 탐색 |
| 네이버 지도 | ✅ 연동 완료 | 학교 위치 검색/선택 |
| YouTube Data v3 | ❌ 미구현 | 수업스케치 영상 검색용 |
| Firebase Auth | ❌ 미구현 | Phase 3 예정 |
| Firestore | ❌ 미구현 | Phase 3 예정 |

### 3.3 데이터 저장 방식
- **현재**: localStorage (모든 데이터)
- **예정**: Firestore 실시간 동기화 + 오프라인 persistence

---

## 4. 모듈식 체육 활동 시스템 (최근 설계)

### 4.1 핵심 아이디어
기존 atom × modifier 랜덤 조합 → **구조(A) × 기술(B) × 변형(C)** 모듈 컴파일 방식으로 전환

```
활동 = 구조모듈(A) × 기술모듈(B) × 변형모듈(C, 선택)

예:
  대장활동(A) × 인사이드패스(B)              = "축구 대장패스"
  대장활동(A) × 체스트패스(B)                = "농구 대장패스"
  얼음땡(A)  × 발드리블(B) × 스쿼트벌칙(C)  = "축구 얼음땡 드리블 + 스쿼트벌칙"
```

### 4.2 모듈 데이터 현황
- `structures.json`: 구조 모듈 11개 (대장활동, 얼음땡, 릴레이, 짝활동 등)
- `skills.json`: 기술 모듈 20개 (종목별 FMS 기반 기술)
- `modifiers.json`: 변형 모듈 12개 (스쿼트벌칙, 스피드게임, 점수제 등)
- `sports.json`: 종목 정보 9개 (축구, 농구, 피구, 배구, 티볼, 발야구, 빅발리볼, 플라잉디스크, 줄넘기)
- `fmsCurriculum.json`: FMS 교육과정 (학년별)

### 4.3 구현해야 할 핵심 함수
1. `filterCompatibleModules(request)` → 호환 모듈 필터링
2. `compileActivity(structure, skill, modifier?)` → 슬롯 치환 컴파일
3. `generateLessonPlan(compiledActivities, totalLessons, schoolLevel)` → 차시 배치
4. `generateModularCandidates(request)` → 메인 후보 생성

### 4.4 차시 구성 패턴
```
1차시: [기본+응용+챌린지 압축]
3차시: [기본] → [응용] → [챌린지]
5차시: [기본1] → [기본2] → [응용1] → [응용2] → [챌린지]
```

---

## 5. 날씨/대기질 시스템 상세

### 5.1 WeatherPage 구조
```
WeatherPage.jsx
├── WeatherDetail    → 현재 기온, 습도, 풍속, 강수형태
├── OutdoorJudge     → 야외수업 적합도 판단 (날씨+대기질 종합)
├── AirQuality       → PM10/PM2.5 수치 + 등급
└── HourlyForecast   → 시간별 예보 (현재 Mock)
```

### 5.2 야외수업 판단 로직 (OutdoorJudge)
- 기온, 강수, 풍속, 미세먼지를 종합 판단
- "야외수업 적합" / "주의 필요" / "실내수업 권장" 3단계
- 날씨 탭 → 수업스케치 탭으로 연동 (weatherFilter)

### 5.3 위치 설정 흐름
1. 설정 페이지에서 네이버 지도로 학교 위치 선택
2. 위경도 좌표 → 기상청 격자 좌표 변환 (gridConvert.js)
3. 위경도 좌표 → 가장 가까운 대기질 측정소 탐색 (findNearestStation)
4. 설정된 위치 기반으로 실시간 날씨/대기질 데이터 제공

---

## 6. 수업스케치 추천 시스템 상세

### 6.1 현재 시스템 (기존, 리팩터링 대상)
```
입력 조건:
  학년, 영역(스포츠), 종목(축구/농구/피구/배구), FMS, 위치, 시간, 장비

추천 파이프라인:
  1. generateCandidates(): atom × modifier 랜덤 조합 140회 시도
  2. validateCandidate(): FMS/종목/장비/공간 호환성 검증
  3. scoreCandidate(): 5가지 점수 (FMS매치/전략/운영/참신/중복패널티)
  4. 상위 3개 후보 반환

출력:
  - 3개 후보 카드 (제목, 규칙, 운영팁, 교육효과, 장비, YouTube 링크)
  - 후보 없을 시 fallback: activities.json에서 랜덤 선택
```

### 6.2 3단계 워크플로우 (SketchPage)
- **Step 1 - 조건 설정**: FilterPanel로 종목/학년/FMS/장비 등 입력
- **Step 2 - 후보 확인**: ResultCard 3개 비교, 수업 아웃라인 자동 생성
- **Step 3 - 수업 확정**: 선택한 활동 확정 + 메모 추가, 학급별 기록 저장

---

## 7. 향후 계획 (대화에서 논의된 내용)

### 7.1 모듈식 활동 시스템 구현 (우선순위 높음)
- Phase 1: 모듈 컴파일 엔진 (generateCandidates.js 리팩터링)
- Phase 2: UI 업데이트 (FilterPanel, ResultCard, SketchPage)
- Phase 3: Firebase Genkit RAG (벡터 검색 기반 추천)

### 7.2 Firebase Genkit + 임베딩 + 로컬 LLM 연동 (논의 시작)
- 사용자가 Firebase Genkit 설치 및 임베딩/로컬 LLM 연동 계획 작성을 요청
- 모듈 데이터를 벡터 임베딩으로 변환하여 의미 기반 검색
- 로컬 LLM (Ollama 등)으로 오프라인 추천 가능성 탐색
- 상세 계획은 별도 문서로 작성 예정

### 7.3 Firebase 연동 (Phase 3)
- Firebase Auth: 교사 로그인
- Firestore: 실시간 데이터 동기화
- 보안 규칙: 학생 개인정보 보호 (본인 계정만 접근)

### 7.4 PWA & 배포 (Phase 4)
- Workbox 7 서비스워커
- 오프라인 지원
- 커스텀 도메인

---

## 8. 기술적 주의사항

### API 제한
- 공공데이터포털: 일 1,000회 → 1시간 캐싱 필수
- YouTube Data API: 일 100회 → 6시간 캐싱 필수
- Firestore 무료: 일 읽기 50K, 쓰기 20K

### 성능 최적화
- 모바일(<640px): backdrop-filter 비활성화
- 트랜지션 간소화 (0.15s)
- Pretendard 웹폰트 CDN

### 개인정보
- 학생 이름 = 개인정보 → Firestore 보안 규칙으로 본인만 접근
- 학생 이름 외 개인정보 일절 수집 안 함

### 디자인 원칙
- **절대 다크 테마 사용 금지** - classpet 라이트 테마 일관 유지
- 모바일 퍼스트 (터치 타겟 최소 44×44px)
- 리퀴드 글래스 이펙트

---

## 9. 현재 dependencies
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-colorful": "^5.6.1",
    "react-dom": "^18.3.1",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.22.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "tailwindcss": "^3.4.3",
    "vite": "^5.2.11",
    "gh-pages": "^6.3.0"
  }
}
```

> **참고**: Firebase SDK, Genkit, Ollama 등은 아직 설치되지 않은 상태

---

## 10. 클로드 코드에 전달할 핵심 컨텍스트

1. **CLAUDE.md** 파일에 프로젝트 전체 설계가 문서화되어 있음 → 반드시 참고
2. **MODULE_SYSTEM_SPEC.md**에 모듈식 활동 시스템 상세 명세가 있음
3. **PRD.md**에 원본 기획서가 있음
4. 현재 추천 시스템은 `src/utils/recommend/` 하위 파일들이 핵심
5. 날씨 API는 `src/services/weatherApi.js`에서 실제 연동 완료 상태
6. 모듈 데이터는 `src/data/modules/` 에 5개 JSON 파일로 준비 완료
7. **다음 작업**: 모듈 컴파일 엔진 구현 → UI 업데이트 → Firebase Genkit RAG
