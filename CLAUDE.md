# CLAUDE.md - 오늘 체육 뭐하지?

## 프로젝트 개요
체육교사의 하루 워크플로우(날씨 확인 → 시간표 → 수업 설계 → 학급 관리)를
하나의 PWA 앱으로 통합하는 **모바일 퍼스트 웹앱**.

- **대상**: 초·중·고 체육교사 (초기에는 초등 전담교사)
- **핵심 흐름**: 아침에 날씨 확인 → 시간표로 오늘 수업 파악 → 수업스케치로 활동 선택 → 학급별 수업 기록

## 기술 스택
- **Frontend**: React 18 + Vite 5 + Tailwind CSS 3
- **Backend**: Firebase (Auth + Firestore)
- **외부 API**: 기상청 단기예보, 에어코리아 대기오염, YouTube Data v3
- **PWA**: Workbox 7
- **패키지 매니저**: pnpm
- **폰트**: Pretendard (CDN)

## 개발 명령어
```bash
pnpm dev          # 개발 서버 (localhost:5173)
pnpm build        # 프로덕션 빌드
pnpm preview      # 빌드 미리보기
pnpm lint         # ESLint 실행
firebase deploy   # Firebase Hosting 배포
```

## 디렉토리 구조
```
오늘체육뭐하지/
├── public/                    # 정적 파일 (manifest, icons, sw)
├── src/
│   ├── main.jsx               # 엔트리 포인트
│   ├── App.jsx                # 라우터 + 레이아웃
│   ├── components/
│   │   ├── layout/            # Header, TopNav(상단 탭바), HamburgerMenu(모바일)
│   │   ├── home/              # WeatherMini, TodaySchedule, RecentLessons
│   │   ├── weather/           # WeatherDetail, AirQuality, OutdoorJudge
│   │   ├── schedule/          # ScheduleGrid, ScheduleEditor
│   │   ├── sketch/            # FilterPanel, ResultCard, VideoSection, LessonMemo
│   │   └── classes/           # ClassList, RosterEditor, BulkImport, HistoryView
│   ├── pages/                 # HomePage, WeatherPage, SchedulePage, SketchPage, ClassesPage
│   ├── hooks/                 # useAuth, useClassManager, useSchedule, useWeather, useRecommend
│   ├── services/              # firebase.js, weatherApi.js, youtubeApi.js
│   ├── data/                  # activities.json, domains.js, constants.js
│   ├── utils/                 # gridConvert, dateUtils, scheduleUtils, generateId
│   └── styles/
│       ├── globals.css        # Tailwind base + 커스텀
│       └── css/               # base/ + components/ + utilities/
├── .env.local                 # API 키 (git 미추적)
├── tailwind.config.js
├── vite.config.js
├── firebase.json
├── firestore.rules
├── PRD.md
└── CLAUDE.md
```

## 핵심 아키텍처 결정

### 1. 5탭 구조
```
🏠 오늘 → 🌤️ 날씨 → 📅 시간표 → ✏️ 수업스케치 → 📋 학급
```
- **태블릿/데스크톱(640px+)**: 상단 탭바 (글래스 이펙트)
- **모바일(<640px)**: 햄버거 버튼 → 좌측 슬라이드 메뉴

### 2. classpet 기반 라이트 테마
- 크림 배경 `#FFF9F0` + 리퀴드 글래스 이펙트
- **절대 다크 테마 사용하지 않음** - classpet 디자인 시스템 일관 유지
- 모바일(<640px)에서 backdrop-filter 비활성화 (성능 최적화)

### 3. 데이터 저장 전략
- **Phase 1-2**: localStorage로 먼저 구현 (빠른 프로토타이핑)
- **Phase 3**: Firestore 실시간 동기화 + 오프라인 persistence로 전환
- `onSnapshot` 실시간 리스너 패턴

### 4. 모바일 퍼스트
- 운동장에서 한 손 조작이 기본 유스케이스
- 터치 타겟 최소 44×44px
- 폰트 스케일: 모바일 13px → 데스크톱 15px

### 5. 학교급 확장성
- 활동 DB에 `schoolLevel: "초등" | "중등" | "고등"` 필드
- 초기에는 초등 활동 20개만 포함, 점진적 확장
- 학급 설정 위저드에 학교급 선택 Step 추가

## 디자인 시스템 (classpet 기반)

### 컬러 팔레트
```
배경:      #FFF9F0 (크림)
Primary:   #7C9EF5 (파란색)     → 그라디언트: #7C9EF5 → #A78BFA
Secondary: #F5A67C (오렌지)     → 그라디언트: #F5A67C → #F5E07C
Success:   #7CE0A3 (초록)       → 그라디언트: #7CE0A3 → #7CF5D4
Warning:   #F5E07C (노랑)
Danger:    #F57C7C (빨강)
텍스트:    #2D3748 (다크 그레이)마지마
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
css/components/ → navbar.css, cards.css, modal.css, buttons.css
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
- 함수형 컴포넌트 + hooks
- 상태관리: React hooks + (추후) Firestore onSnapshot
- 스타일: Tailwind 유틸리티 클래스 + CSS 모듈

### 파일 네이밍
- 컴포넌트: **PascalCase** (WeatherDetail.jsx)
- 유틸/훅: **camelCase** (useWeather.js, dateUtils.js)
- CSS: **kebab-case** (variables.css, glass.css)
- 페이지: **PascalCase** + Page 접미사 (HomePage.jsx)

### 교육과정 영역 색상 매핑
```javascript
const DOMAIN_COLORS = {
  "운동": "#F57C7C",   // 💪 빨강
  "스포츠": "#7C9EF5", // ⚽ 파랑
  "표현": "#A78BFA",   // 🎭 보라
};
```

## 데이터 모델 (Firestore)

```
/users/{uid}                           - 사용자 프로필 + 학교 정보
/users/{uid}/config                    - 학급 설정
/users/{uid}/classes/{classId}         - 학급 정보
/users/{uid}/classes/{classId}/roster  - 학생 명단
/users/{uid}/classes/{classId}/records - 수업 기록
/users/{uid}/schedule/{dayOfWeek}     - 시간표 (월~금)
/activities                            - 활동 DB (공유, 읽기 전용)
```

### 시간표 스키마
```javascript
// /users/{uid}/schedule/monday
{
  periods: [
    { period: 1, classId: "abc", className: "3-1" },
    { period: 2, classId: "def", className: "3-2" },
    // ... 최대 7교시
  ]
}
```

## API 키 관리
- **개발**: `.env.local` (git 미추적)
  ```
  VITE_WEATHER_API_KEY=xxx
  VITE_AIR_API_KEY=xxx
  VITE_YOUTUBE_API_KEY=xxx
  VITE_FIREBASE_API_KEY=xxx
  ```
- **프로덕션**: Firebase Cloud Functions 프록시

## 배포
- `firebase deploy` → Firebase Hosting
- GitHub Actions CI/CD (향후)
- 커스텀 도메인 연결 (향후)

## 개발 로드맵 요약
| Phase | 범위 | 기간 |
|-------|------|------|
| 1 | 프로젝트 셋업 + 홈/시간표/학급 + localStorage | 2주 |
| 2 | 날씨 API + 수업스케치 | 1주 |
| 3 | Firebase 연동 (Auth + Firestore) | 1주 |
| 4 | PWA & 배포 | 3일 |
| 5 | 도구 탭, 활동 확장, 고도화 | 지속 |

## 주의사항

### 개인정보
- **학생 이름 = 개인정보** → Firestore 보안 규칙으로 본인 계정만 접근
- 학생 이름 외 개인정보 일절 수집하지 않음

### API 제한
- 공공데이터포털: 일 1,000회 → 캐싱 필수 (1시간)
- YouTube Data API: 일 100회 검색 → 캐싱 필수 (6시간)
- Firestore 무료: 일 읽기 50K, 쓰기 20K

### PWA iOS 제한
- 서비스워커 캐시 용량 제한
- 푸시 알림: iOS 16.4+부터 지원

### 성능
- 모바일(<640px): backdrop-filter 비활성화
- 트랜지션 간소화 (0.15s)
- blob 애니메이션 제거
- Pretendard 폰트 CDN (로컬 폰트 아님)

### 한국어 처리
- UTF-8 인코딩 필수
- Pretendard 웹폰트로 한글 렌더링
- 날짜 포맷: YYYY-MM-DD (한국식) 또는 M/D (간략)
