# CLAUDE.md - 오늘 체육 뭐하지?

> 이 문서는 Claude Code(AI 어시스턴트)와 개발자(본인) 모두를 위한 프로젝트 가이드입니다.
> AI는 기술 정보를, 본인은 설계 의도와 맥락을 참고합니다.

## 프로젝트 개요
체육교사의 하루 워크플로우(날씨 확인 → 시간표 → 수업 설계 → 학급 관리)를
하나의 PWA 앱으로 통합하는 **모바일 퍼스트 웹앱**.

- **대상**: 초·중·고 체육교사 (초기에는 초등 전담교사)
- **핵심 흐름**: 아침에 날씨 확인 → 시간표로 오늘 수업 파악 → 수업스케치로 활동 선택 → 학급별 수업 기록

## 기술 스택
- **Frontend**: React 18 + Vite 5 + Tailwind CSS 3
- **Backend**: Firebase Auth + Firestore (현재 미구현, Phase 3 예정)
- **외부 API**: 기상청 단기예보, 에어코리아 대기오염, 네이버 지도/검색 API
- **PWA**: Workbox 7 (현재 미구현, Phase 4 예정)
- **모듈 방식**: ESM (import/export) - 모든 파일이 ES Modules 사용
- **패키지 매니저**: pnpm (npm도 호환)
- **배포**: Netlify + Netlify Functions (네이버 API CORS 프록시)
- **폰트**: Pretendard (CDN)

## 현재 진행 상태
- **Phase 1-2 완료**: localStorage 기반 프로토타입 (UI + 기능 개선 중)
- **Phase 3 미착수**: Firebase 연동
- **Phase 4 미착수**: PWA (manifest, service worker 없음)

## 개발 명령어
```bash
pnpm dev          # 개발 서버 (localhost:5176)
pnpm build        # 프로덕션 빌드 (dist/)
pnpm preview      # 빌드 미리보기
pnpm lint         # ESLint 실행
pnpm deploy       # GitHub Pages 배포 (gh-pages -d dist)
```

## 디렉토리 구조
```
오늘체육뭐하지/
├── public/                    # 정적 파일 (favicon만 존재)
├── netlify/
│   └── functions/
│       └── naver-search.mjs   # 네이버 검색 API CORS 프록시 (Netlify Function)
├── src/
│   ├── main.jsx               # 엔트리 포인트
│   ├── App.jsx                # 라우터 + 레이아웃 + ProtectedRoute
│   ├── components/
│   │   ├── layout/            # Header, TopNav(상단 탭바), HamburgerMenu(모바일)
│   │   ├── common/            # GlassCard, ConfirmDialog, Modal
│   │   ├── home/              # HourlyWeatherSummary, TodaySchedule, RecentLessons
│   │   ├── weather/           # WeatherDetail, AirQuality, HourlyForecast, OutdoorJudge, StationPicker
│   │   ├── schedule/          # ScheduleGrid, PeriodCell, BulkScheduleSetup
│   │   ├── sketch/            # FilterPanel, ResultCard, LessonMemo
│   │   ├── classes/           # RosterEditor
│   │   └── settings/          # LocationMapPicker
│   ├── pages/                 # HomePage, WeatherPage, SchedulePage, SketchPage,
│   │                          # ClassesPage, SettingsPage, SetupWizard
│   ├── hooks/
│   │   ├── useLocalStorage.js # localStorage <-> React 상태 동기화 (CustomEvent 크로스탭)
│   │   ├── useClassManager.js # 학급/학생/수업기록 CRUD (뚝뚝한 훅)
│   │   ├── useSchedule.js     # 시간표 CRUD (기본 + 주차별 오버라이드)
│   │   ├── useSettings.js     # 위치/환경 설정
│   │   ├── useRecommend.js    # 활동 추천 엔진 (필터 + 후보 생성)
│   │   └── useCurrentPeriod.js # 현재 교시 계산
│   ├── services/
│   │   ├── weatherApi.js      # 기상청 + 에어코리아 + 측정소 검색 API
│   │   └── naverLocal.js      # 네이버 지도 역지오코딩 + 로컬 검색
│   ├── data/
│   │   ├── activities.json    # 활동 데이터베이스
│   │   ├── activityAtoms.json # 원자 활동 구성요소
│   │   ├── fmsTaxonomy.json   # 기본운동기술(FMS) 분류 체계
│   │   ├── sportCoreRules.json # 스포츠 핵심 규칙
│   │   ├── ruleModifiers.json # 규칙 변형 수정자
│   │   └── mockWeather.js     # 야외수업 판단 로직 + 목업 데이터
│   ├── utils/
│   │   ├── gridConvert.js     # WGS84 ↔ 기상청 격자 좌표 변환
│   │   ├── generateId.js      # 고유 ID 생성기
│   │   ├── loadNaverMapScript.js # 네이버 지도 SDK 동적 로더
│   │   └── recommend/         # 활동 추천 알고리즘
│   │       ├── generateCandidates.js  # 후보 생성
│   │       ├── scoreCandidate.js      # 점수 산출
│   │       ├── validateCandidate.js   # 유효성 검증
│   │       └── renderTemplate.js      # 템플릿 렌더링
│   └── styles/
│       ├── globals.css        # Tailwind base + 커스텀
│       └── css/               # base/ + components/ + utilities/
├── .env.local                 # API 키 (git 미추적)
├── tailwind.config.js
├── vite.config.js
├── postcss.config.js
├── PRD.md
└── CLAUDE.md
```

## 핵심 아키텍처 결정

### 1. 5탭 + 설정
```
🏠 오늘 → 🌤️ 날씨 → 📅 시간표 → ✏️ 수업스케치 → 📋 학급 (+ ⚙️ 설정)
```
- **태블릿/데스크톱(640px+)**: 상단 탭바 (글래스 이펙트)
- **모바일(<640px)**: 햄버거 버튼 → 좌측 슬라이드 메뉴
- 첫 진입 시 SetupWizard(학교급 → 학년 → 학급수 → 학생수) 필수

### 2. classpet 기반 라이트 테마
- 크림 배경 `#FFF9F0` + 리퀴드 글래스 이펙트
- **절대 다크 테마 사용하지 않음** - classpet 디자인 시스템 일관 유지
- 모바일(<640px)에서 backdrop-filter 비활성화 (성능 최적화)

### 3. 데이터 저장 전략 (현재: localStorage 100%)

**현재 Phase 1-2**: 모든 데이터를 localStorage에 저장
- `useLocalStorage` 훅이 CustomEvent(`pe-local-storage-sync`)로 크로스탭 동기화 제공
- 각 훅이 독립적으로 localStorage에 접근

| localStorage 키 | 훅 | 용도 |
|-----------------|-----|------|
| `pe_class_setup` | useClassManager | 학교급, 학년, 학급수 설정 |
| `pe_classes` | useClassManager | 학급 목록 + 색상 + 마지막 활동 |
| `pe_rosters` | useClassManager | 학급별 학생 명단 |
| `pe_class_records` | useClassManager | 학급별 수업 기록 |
| `pe_timetable_base` | useSchedule | 기본 시간표 (월~금 × 7교시) |
| `pe_timetable_weeks` | useSchedule | 주차별 오버라이드 (ISO주 기준) |
| `pe-teacher-settings` | useSettings | 위치, 측정소, 앱 설정 |

**미래 Phase 3**: 전체 워크플로우 완성 + 구글 연동 이후
- Firebase Auth + Firestore로 전환
- 교사 중심의 학급/학생 관리 체계 구축
- localStorage 키 → Firestore 컬렉션 매핑 계획 수립 후 진행

### 4. 훅 설계 철학: "뚝뚝한 훅" (Fat Hook)

학교 업무에 비유하면, 각 훅은 **담당 업무 담당자**:
- `useClassManager` = **학급담임**: 학급 목록, 학생 명단, 수업 기록 모두 관리
- `useSchedule` = **교무부장**: 시간표 작성, 주차별 변경 관리
- `useSettings` = **행정실장**: 학교 위치, 환경설정 관리
- `useRecommend` = **체육부장**: 활동 추천, 필터링
- `useLocalStorage` = **서류함**: 모든 데이터 보관 캐비넷

**원칙**: 하나의 훅이 해당 기능의 데이터 접근 + 비즈니스 로직을 모두 담당한다.
페이지에서는 훅만 불러오면 해당 기능을 바로 쓸 수 있어야 한다.
단, 하나의 훅에 역할이 과중되면(너무 많은 책임) 관련 훅으로 분리한다.

### 5. 모바일 퍼스트
- 운동장에서 한 손 조작이 기본 유스케이스
- 터치 타겟 최소 44×44px
- 폰트 스케일: 모바일 13px → 데스크톱 15px

### 6. 학교급 확장성
- 활동 DB에 `schoolLevel: "초등" | "중등" | "고등"` 필드
- 초기에는 초등 활동 20개만 포함, 점진적 확장
- 학급 설정 위저드에 학교급 선택 Step 추가

### 7. 상태관리: Context API 미사용
- React 커스텀 훅이 컨트롤러 역할 (각 훅이 localStorage 직접 관리)
- 공유 상태가 필요한 경우 훅을 각 컴포넌트에서 독립 호출
- `useLocalStorage`의 CustomEvent가 탭 간 동기화를 보장
- Redux/Zustand 등 외부 상태관리 라이브러리 미사용

## 디자인 시스템 (classpet 기반)

### 컬러 팔레트
```
배경:      #FFF9F0 (크림)
Primary:   #7C9EF5 (파란색)     → 그라디언트: #7C9EF5 → #A78BFA
Secondary: #F5A67C (오렌지)     → 그라디언트: #F5A67C → #F5E07C
Success:   #7CE0A3 (초록)       → 그라디언트: #7CE0A3 → #7CF5D4
Warning:   #F5E07C (노랑)
Danger:    #F57C7C (빨강)
텍스트:    #2D3748 (다크 그레이)
보조텍스트: #718096
```

### 리퀴드 글래스 이펙트
```css
background: linear-gradient(145deg, rgba(255,255,255,0.55), rgba(255,255,255,0.2));
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.6);
box-shadow: 0 4px 12px rgba(0,0,0,0.08);
```

### 탭별 고유 색상
| 탭 | 색상 |
|----|------|
| 🏠 오늘 | blue #7C9EF5 |
| 🌤️ 날씨 | mint #7CE0A3 |
| 📅 시간표 | yellow #F5E07C |
| ✏️ 수업스케치 | pink #F5A67C |
| 📋 학급 | purple #A78BFA |

### CSS 구조
```
css/base/       → variables.css, typography.css, layout.css
css/components/ → navbar.css, cards.css, modal.css, buttons.css, badges.css, forms.css
css/utilities/  → animations.css, glass.css, responsive.css
```

### Border Radius
- 칩: 8px, 카드/버튼: 16px, 큰 카드: 20px, 모달: 24px

### 컨테이너 max-width
- 태블릿: 576px, PC: 672px, XL: 1000px

## 코드 스타일

### 언어
- **UI 텍스트**: 한국어 (모든 사용자 대면 텍스트)
- **코드**: 영어 (변수명, 함수명, 주석)

### React 패턴
- 함수형 컴포넌트 + hooks (클래스 컴포넌트 사용하지 않음)
- 상태관리: 커스텀 훅 + useLocalStorage (향후 Firestore onSnapshot)
- 스타일: Tailwind 유틸리티 클래스 + 커스텀 CSS
- 알림: react-hot-toast (하단 중앙, 3초)
- 확인 다이얼로그: window.showConfirm (전역 패턴)

### 파일 네이밍
- 컴포넌트: **PascalCase** (WeatherDetail.jsx)
- 유틸/훅: **camelCase** (useSchedule.js, gridConvert.js)
- CSS: **kebab-case** (variables.css, glass.css)
- 페이지: **PascalCase** + Page 접미사 (HomePage.jsx)
- 상수: **camelCase** 파일 내 **UPPER_SNAKE_CASE** 변수

### 코드 구조 원칙
- **파일/폴더 과중 방지**: 하나의 컴포넌트, 훅, 서비스 파일에 너무 많은 책임이 몰리지 않도록 한다. 역할이 뚜렷히 구분되면 분리를 검토한다.
- **빈 상태 안내 필수**: 데이터가 없을 때 "아직 수업 기록이 없습니다" 같은 친절한 안내 문구를 표시한다. 빈 화면을 방치하지 않는다.
- **초기 로딩 3초 이내**: 첫 화면이 3초 안에 보여야 한다. 레이지 로딩, 코드 스플리팅을 적극 활용한다.

### 교육과정 영역 색상 매핑
```javascript
const DOMAIN_COLORS = {
  "운동": "#F57C7C",   // 빨강
  "스포츠": "#7C9EF5", // 파랑
  "표현": "#A78BFA",   // 보라
};
```

## 데이터 모델

### 현재: localStorage (Phase 1-2)
위의 "데이터 저장 전략" 섹션의 키 레지스트리 참조.

### 미래: Firestore (Phase 3 - 전체 워크플로우 완성 후)
교사 중심의 학급/학생 관리 체계. 전환 시 아래 매핑 참고:
```
pe_class_setup    → /users/{uid}/config
pe_classes        → /users/{uid}/classes/{classId}
pe_rosters        → /users/{uid}/classes/{classId}/roster
pe_class_records  → /users/{uid}/classes/{classId}/records
pe_timetable_base → /users/{uid}/schedule/base
pe_timetable_weeks→ /users/{uid}/schedule/weeks/{weekKey}
pe-teacher-settings → /users/{uid}/settings
```

## API 키 관리

### 개발 (.env.local, git 미추적)
```
VITE_PUBLIC_DATA_API_KEY=xxx        # 공공데이터포털 (기상청 + 에어코리아)
VITE_WEATHER_API_ENDPOINT=xxx       # 기상청 단기예보 URL
VITE_AIR_API_ENDPOINT=xxx           # 에어코리아 대기오염 URL
VITE_NAVER_CLIENT_ID=xxx            # 네이버 지도 API (NCP)
VITE_NAVER_CLIENT_SECRET=xxx        # 네이버 지도 API (NCP)
VITE_NAVER_SEARCH_CLIENT_ID=xxx     # 네이버 검색 API
VITE_NAVER_SEARCH_CLIENT_SECRET=xxx # 네이버 검색 API
```

### 프로덕션 (Netlify 환경변수)
```
NAVER_SEARCH_CLIENT_ID=xxx          # Netlify Function용
NAVER_SEARCH_CLIENT_SECRET=xxx      # Netlify Function용
```

### CORS 프록시
- **개발**: Vite proxy (`vite.config.js` → `/api/naver-search`)
- **프로덕션**: Netlify Function (`netlify/functions/naver-search.mjs`)

## 배포
- **현재**: Netlify (자동 빌드 + Netlify Functions)
- **대안**: `pnpm deploy` → GitHub Pages (gh-pages)
- **향후**: Firebase Hosting (Phase 3 이후 검토)
- 커스텀 도메인 연결 (향후)

## 개발 로드맵 요약
| Phase | 범위 | 상태 |
|-------|------|------|
| 1 | 프로젝트 셋업 + 홈/시간표/학급 + localStorage | 완료 |
| 2 | 날씨 API + 수업스케치 + UI 개선 | 진행 중 |
| 3 | Firebase 연동 (Auth + Firestore) | 미착수 |
| 4 | PWA (manifest + service worker) | 미착수 |
| 5 | 도구 탭, 활동 확장, YouTube API, 고도화 | 미착수 |

## 주의사항

### 개인정보
- **학생 이름 = 개인정보** → 현재 localStorage에만 저장 (기기 내)
- Firestore 전환 시 보안 규칙으로 본인 계정만 접근
- 학생 이름 외 개인정보 일절 수집하지 않음

### API 제한
- 공공데이터포털: 일 1,000회 → 인메모리 캐싱 적용 (Map 객체)
- YouTube Data API: 일 100회 검색 → 캐싱 필수 (Phase 5에서 구현)
- Firestore 무료: 일 읽기 50K, 쓰기 20K (Phase 3 대비)

### 성능
- 초기 로딩 3초 이내 목표
- 모바일(<640px): backdrop-filter 비활성화
- 트랜지션 간소화 (0.15s)
- blob 애니메이션 제거
- Pretendard 폰트 CDN (로컬 폰트 아님)
- API 응답은 인메모리 Map 캐싱 (weatherApi.js의 STATION_LIST_CACHE 등)

### 한국어 처리
- UTF-8 인코딩 필수
- Pretendard 웹폰트로 한글 렌더링
- 날짜 포맷: YYYY-MM-DD (한국식) 또는 M/D (간략)
