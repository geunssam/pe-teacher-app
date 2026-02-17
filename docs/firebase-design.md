# Firebase Firestore 설계서

> "오늘 체육 뭐하지?" — Phase 3 Firebase 전환을 위한 데이터 모델링 문서
>
> 작성일: 2026-02-16 | 버전: 1.0.0

---

## 목차

1. [Firestore 컬렉션 구조도](#1-firestore-컬렉션-구조도)
2. [각 컬렉션/문서 스키마](#2-각-컬렉션문서-스키마)
3. [Firebase Auth 흐름](#3-firebase-auth-흐름)
4. [Firestore Security Rules 초안](#4-firestore-security-rules-초안)
5. [인덱스 설계](#5-인덱스-설계)
6. [localStorage → Firestore 마이그레이션 매핑표](#6-localstorage--firestore-마이그레이션-매핑표)
7. [확장 고려사항](#7-확장-고려사항)
8. [비용 최적화 전략](#8-비용-최적화-전략)

---

## 1. Firestore 컬렉션 구조도

```
firestore-root/
│
├── users/{uid}/                          ← 교사 프로필 + 설정 (1인 1문서)
│   ├── (필드: displayName, email, photoURL, schoolLevel, settings, ...)
│   │
│   ├── classes/{classId}/                ← 학급 목록 (서브컬렉션)
│   │   ├── (필드: grade, classNum, studentCount, color, lastActivity, ...)
│   │   │
│   │   ├── roster/{studentId}/           ← 학생 명단 (서브컬렉션, 개인정보)
│   │   │   └── (필드: num, name, gender, note)
│   │   │
│   │   └── records/{recordId}/           ← 수업 기록 (서브컬렉션)
│   │       └── (필드: date, activity, domain, sequence, aceLesson, ...)
│   │
│   ├── schedule/                         ← 시간표 (서브컬렉션, 문서 2개)
│   │   ├── base                          ← 기본 시간표 문서
│   │   │   └── (필드: cells: { "mon-1": {...}, "tue-3": {...} })
│   │   └── weeks/{weekKey}               ← 주차별 오버라이드
│   │       └── (필드: cells: { "mon-1": {...} | null })
│   │
│   ├── editedLessons/{activityId}/       ← 편집된 ACE 수업안 (서브컬렉션)
│   │   └── (필드: activityName, aceLesson, updatedAt)
│   │
│   ├── myActivities/{activityId}/        ← 내 활동 (서브컬렉션)
│   │   └── (필드: name, source, fmsSkills, aceLesson, ...)
│   │
│   └── curriculum/                       ← 교육과정 커스텀 데이터 (서브컬렉션)
│       ├── customActivities              ← 커스텀 활동 목록 문서
│       │   └── (필드: activities: { activityId: {...} })
│       └── customAlternatives            ← 대체 활동 매핑 문서
│           └── (필드: mappings: { unitId: { lessonKey: [activityId] } })
│
└── (모듈 데이터: 클라이언트 JSON 유지 — Firestore 미저장)
    ※ modules/structures.json, skills.json, modifiers.json, sports.json
    ※ data/fmsTaxonomy.json, curriculum/*.json
    → 모든 교사가 동일한 데이터를 사용하므로 클라이언트 번들에 포함
    → 업데이트 시 앱 배포로 반영 (Phase 3.5에서 Firestore 전환 검토)
```

### 구조 결정 근거

| 결정 | 근거 |
|------|------|
| `users/{uid}` 최상위 | 1인 교사 전용, uid가 자연스러운 파티션 키 |
| `classes`를 서브컬렉션으로 | 학급별 독립 CRUD + 쿼리 가능 (학년별 필터 등) |
| `roster`를 classes 하위로 | 학생 명단은 학급에 종속, 개인정보 보안 범위 최소화 |
| `records`를 classes 하위로 | 학급별 수업 기록 조회가 주 패턴 (학급별 차시 진행) |
| `schedule`을 별도 서브컬렉션으로 | base/weeks 패턴이 명확, 문서 수 예측 가능 |
| 모듈 데이터 클라이언트 유지 | 읽기 전용 + 전체 교사 공유 → Firestore 읽기 비용 절약 |

---

## 2. 각 컬렉션/문서 스키마

### 2.1 `users/{uid}` — 교사 프로필

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `displayName` | `string` | O | Google 계정 표시 이름 |
| `email` | `string` | O | Google 이메일 |
| `photoURL` | `string` | X | Google 프로필 사진 URL |
| `schoolLevel` | `string` | O | 학교급: `"초등"` \| `"중등"` \| `"고등"` |
| `grades` | `array<object>` | O | 담당 학년 설정 (아래 참조) |
| `settings` | `object` | O | 앱 설정 (아래 참조) |
| `createdAt` | `timestamp` | O | 계정 생성 시각 |
| `updatedAt` | `timestamp` | O | 마지막 수정 시각 |
| `lastLoginAt` | `timestamp` | X | 마지막 로그인 시각 |

**`grades` 배열 요소 스키마:**

```javascript
{
  grade: 3,              // number — 학년
  count: 4,              // number — 반 수
  studentCount: 25       // number — 기본 학생 수 (반별 다를 수 있음)
}
```

**`settings` 객체 스키마:**

```javascript
{
  location: {
    name: "OO초등학교",     // string — 학교 이름
    address: "서울시 ...",   // string | null — 주소
    lat: 37.5665,           // number — 위도
    lon: 126.9780,          // number — 경도
    stationName: "종로구"    // string — 대기측정소명
  },
  lastUpdated: "2026-02-16T..." // string — 마지막 설정 수정 시각
}
```

### 2.2 `users/{uid}/classes/{classId}` — 학급

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `grade` | `number` | O | 학년 (3, 4, 5, 6) |
| `classNum` | `number` | O | 반 번호 (1, 2, 3, ...) |
| `studentCount` | `number` | O | 학생 수 |
| `color` | `object` | O | `{ bg: "#FCE7F3", text: "#9F1239", name: "분홍색" }` |
| `lastActivity` | `string` | X | 마지막 수업 활동명 |
| `lastDomain` | `string` | X | 마지막 수업 영역 (`"운동"` \| `"스포츠"` \| `"표현"`) |
| `lastSequence` | `number` | X | 마지막 차시 번호 |
| `lastDate` | `string` | X | 마지막 수업 날짜 (`YYYY-MM-DD`) |
| `createdAt` | `timestamp` | O | 생성 시각 |
| `updatedAt` | `timestamp` | X | 수정 시각 |

### 2.3 `users/{uid}/classes/{classId}/roster/{studentId}` — 학생 명단

> **개인정보 주의**: 학생 이름이 포함됨. Security Rules로 본인만 접근 가능하도록 제한 필수.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `num` | `number` | O | 출석 번호 |
| `name` | `string` | O | 학생 이름 (개인정보) |
| `gender` | `string` | X | 성별 (`""` \| `"남"` \| `"여"`) |
| `note` | `string` | X | 비고 (특이사항) |

### 2.4 `users/{uid}/classes/{classId}/records/{recordId}` — 수업 기록

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `date` | `string` | O | 수업 날짜 (`YYYY-MM-DD`) |
| `recordedAt` | `string` | X | 기록 시점 날짜 |
| `createdAt` | `timestamp` | O | 문서 생성 시각 |
| `classDate` | `string` | X | 시간표 셀 기준 날짜 |
| `day` | `string` | X | 요일 키 (`"mon"` ~ `"fri"`) |
| `period` | `number` | X | 교시 (1~7) |
| `className` | `string` | X | 학급 표시명 (`"3학년 2반"`) |
| `activity` | `string` | O | 활동명 |
| `domain` | `string` | O | 영역 (`"운동"` \| `"스포츠"` \| `"표현"`) |
| `variation` | `string` | X | 변형 규칙 |
| `memo` | `string` | X | 수업 메모 |
| `sequence` | `number` | O | 차시 번호 |
| `performance` | `string` | X | 수행 평가 메모 |
| `subject` | `string` | X | 과목명 (`"체육"`) |
| `source` | `string` | X | 출처 (`"schedule"` \| `"manual"`) |
| `aceLesson` | `object` | X | ACE 수업안 스냅샷 (중첩 객체, 아래 참조) |

**`aceLesson` 중첩 객체 (선택적):**

```javascript
{
  totalMinutes: 40,
  intro: { minutes: 5, flow: ["..."] },
  main: { minutes: 30, flow: ["..."] },
  cooldown: { minutes: 5, flow: ["..."] }
}
```

> aceLesson은 기록 시점의 수업안 스냅샷이므로, 원본 활동이 수정되어도 기록은 보존됩니다.
> Firestore 문서 크기 제한(1MB)에 충분히 여유가 있습니다.

### 2.5 `users/{uid}/schedule/base` — 기본 시간표

단일 문서. `cells` 맵에 `"요일-교시"` 키로 각 셀 데이터를 저장합니다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `cells` | `map` | O | 시간표 셀 맵 (아래 참조) |
| `updatedAt` | `timestamp` | X | 마지막 수정 시각 |

**`cells` 맵의 각 엔트리:**

```javascript
// 키: "mon-1", "tue-3" 등 (요일-교시)
{
  classId: "cls_abc123",     // string — 배정된 학급 ID
  className: "3학년 2반",    // string — 학급 표시명
  subject: "체육",           // string — 과목명
  memo: ""                   // string — 메모 (선택)
}
```

### 2.6 `users/{uid}/schedule/weeks/{weekKey}` — 주차별 오버라이드

weekKey 형식: `"2026-W07"` (ISO 8601 주차)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `cells` | `map` | O | 오버라이드 셀 맵 (기본 시간표와 다른 셀만 포함) |
| `updatedAt` | `timestamp` | X | 마지막 수정 시각 |

> `cells` 맵의 값이 `null`이면 해당 셀을 기본 시간표에서 삭제(빈 칸)하는 의미입니다.
> Firestore에서는 `null` 값을 필드에 저장할 수 있으므로 현재 패턴을 그대로 유지합니다.

### 2.7 `users/{uid}/editedLessons/{activityId}` — 편집된 ACE 수업안

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `activityName` | `string` | O | 활동명 |
| `aceLesson` | `object` | O | 편집된 ACE 수업안 객체 |
| `updatedAt` | `timestamp` | O | 수정 시각 |

### 2.8 `users/{uid}/myActivities/{activityId}` — 내 활동

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | `string` | O | 활동명 |
| `source` | `string` | X | 출처 (`"직접 작성"`, `"유튜브"` 등) |
| `sourceTag` | `string` | O | 항상 `"my"` |
| `standardCodes` | `array<string>` | X | 성취기준 코드 |
| `fmsCategories` | `array<string>` | X | FMS 분류 |
| `fmsSkills` | `array<string>` | X | FMS 기술 |
| `acePhase` | `string` | X | ACE 단계 (`"A"` \| `"C"` \| `"E"`) |
| `space` | `array<string>` | X | 공간 (`"운동장"`, `"체육관"` 등) |
| `equipment` | `array<string>` | X | 장비 목록 |
| `flow` | `array<string>` | X | 활동 흐름 |
| `tags` | `array<string>` | X | 태그 |
| `difficulty` | `number` | X | 난이도 (1~5) |
| `aceLesson` | `object` | X | ACE 수업안 |
| `createdAt` | `timestamp` | O | 생성 시각 |
| `updatedAt` | `timestamp` | O | 수정 시각 |

### 2.9 `users/{uid}/curriculum/customActivities` — 커스텀 활동

단일 문서. 단원 차시에 교사가 직접 추가한 활동들.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `activities` | `map` | O | `{ activityId: { ...activity } }` |
| `updatedAt` | `timestamp` | X | 마지막 수정 시각 |

### 2.10 `users/{uid}/curriculum/customAlternatives` — 대체 활동 매핑

단일 문서. 단원 차시별 대체 활동 ID 목록.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `mappings` | `map` | O | `{ unitId: { lessonKey: [activityId] } }` |
| `updatedAt` | `timestamp` | X | 마지막 수정 시각 |

---

## 3. Firebase Auth 흐름

### 3.1 인증 방식

**Google OAuth 2.0** (팝업 방식) 단일 로그인만 지원합니다.

```
사용자 → "Google로 로그인" 버튼 클릭
       → Firebase signInWithPopup(GoogleAuthProvider)
       → Google OAuth 동의 화면
       → Firebase Auth에 사용자 등록/로그인
       → onAuthStateChanged 리스너 트리거
       → Firestore user 문서 확인/생성
       → 앱 진입 (또는 SetupWizard)
```

### 3.2 상세 흐름

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 앱 로딩      │───▸│ Auth 상태    │───▸│ Firestore    │───▸│ 앱 메인      │
│ (스플래시)   │    │ 확인         │    │ user 문서    │    │ 화면         │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                          │                   │
                    미인증 ▼             문서 없음 ▼
                   ┌──────────────┐    ┌──────────────┐
                   │ 로그인 화면   │    │ SetupWizard  │
                   │ (Google)     │    │ (학교급/학년) │
                   └──────────────┘    └──────────────┘
```

### 3.3 User 문서 생성 로직 (pseudo-code)

```javascript
// auth.js (서비스 레이어)
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

async function onUserLogin(firebaseUser) {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    // 신규 사용자 → user 문서 생성 (SetupWizard로 이동)
    await setDoc(userRef, {
      displayName: firebaseUser.displayName,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL || null,
      schoolLevel: null,       // SetupWizard에서 설정
      grades: [],              // SetupWizard에서 설정
      settings: {
        location: {
          name: '학교 이름',
          address: null,
          lat: 36.3504,
          lon: 127.3845,
          stationName: '대전',
        },
        lastUpdated: null,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    })
    return { isNewUser: true }
  }

  // 기존 사용자 → lastLoginAt 업데이트
  await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true })
  return { isNewUser: false }
}
```

### 3.4 로그인/로그아웃 UI 통합

- **로그인 전**: 별도 로그인 페이지 (`/login`) 또는 모달
- **로그인 후**: 현재 5탭 구조 진입
- **로그아웃**: 설정 페이지 하단 "로그아웃" 버튼 → `signOut(auth)` → `/login`으로 리다이렉트
- **탈퇴**: 설정 페이지 "계정 삭제" → 확인 다이얼로그 → Firestore 데이터 삭제 → Auth 삭제

### 3.5 localStorage 마이그레이션 프롬프트

첫 로그인 시 localStorage에 기존 데이터가 있으면:

```
┌──────────────────────────────────────┐
│  기존 데이터가 있습니다               │
│                                      │
│  이 기기에 저장된 수업 데이터를       │
│  클라우드로 이전할까요?              │
│                                      │
│  • 학급 4개, 수업 기록 32건           │
│  • 시간표 기본 + 3주차분              │
│                                      │
│  [이전하기]  [건너뛰기]  [새로 시작]  │
└──────────────────────────────────────┘
```

---

## 4. Firestore Security Rules 초안

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ========================================
    // 헬퍼 함수
    // ========================================

    // 인증된 사용자인지 확인
    function isAuthenticated() {
      return request.auth != null;
    }

    // 본인 데이터인지 확인
    function isOwner(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }

    // 문서 크기 제한 (1MB 미만)
    function isValidSize() {
      return request.resource.data.keys().size() < 100;
    }

    // ========================================
    // users/{uid} — 교사 프로필
    // ========================================
    match /users/{uid} {
      // 본인만 읽기/쓰기 가능
      allow read, write: if isOwner(uid);

      // ========================================
      // users/{uid}/classes/{classId} — 학급
      // ========================================
      match /classes/{classId} {
        allow read, write: if isOwner(uid);

        // 학생 명단 (개인정보 — 본인만 접근)
        match /roster/{studentId} {
          allow read, write: if isOwner(uid);
        }

        // 수업 기록
        match /records/{recordId} {
          allow read, write: if isOwner(uid);

          // 수업 기록 생성 시 필수 필드 검증
          allow create: if isOwner(uid)
            && request.resource.data.keys().hasAll(['date', 'activity', 'domain', 'sequence'])
            && request.resource.data.date is string
            && request.resource.data.activity is string
            && request.resource.data.domain in ['운동', '스포츠', '표현']
            && request.resource.data.sequence is number;
        }
      }

      // ========================================
      // users/{uid}/schedule — 시간표
      // ========================================
      match /schedule/{docId} {
        allow read, write: if isOwner(uid);
      }

      // ========================================
      // users/{uid}/editedLessons/{activityId}
      // ========================================
      match /editedLessons/{activityId} {
        allow read, write: if isOwner(uid);
      }

      // ========================================
      // users/{uid}/myActivities/{activityId}
      // ========================================
      match /myActivities/{activityId} {
        allow read, write: if isOwner(uid);
      }

      // ========================================
      // users/{uid}/curriculum/{docId}
      // ========================================
      match /curriculum/{docId} {
        allow read, write: if isOwner(uid);
      }
    }

    // ========================================
    // 기본: 모든 접근 거부
    // ========================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Rules 설계 원칙

| 원칙 | 구현 |
|------|------|
| 최소 권한 | 모든 데이터는 `isOwner(uid)` 확인 후에만 접근 |
| 개인정보 보호 | `roster` 서브컬렉션도 동일한 owner 체크 적용 |
| 데이터 무결성 | `records` 생성 시 필수 필드 + 타입 검증 |
| 기본 거부 | 마지막 `match /{document=**}` 규칙으로 모든 미정의 경로 차단 |

---

## 5. 인덱스 설계

### 5.1 자동 생성 인덱스 (단일 필드)

Firestore는 모든 단일 필드에 대해 자동으로 인덱스를 생성합니다.
아래 쿼리는 추가 인덱스 없이 사용 가능합니다:

- `classes` 컬렉션에서 `grade`로 필터링
- `records` 컬렉션에서 `date`로 정렬
- `records` 컬렉션에서 `domain`으로 필터링

### 5.2 복합 인덱스 (수동 생성 필요)

```
firestore.indexes.json
```

```json
{
  "indexes": [
    {
      "collectionGroup": "records",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "domain", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "records",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "day", "order": "ASCENDING" },
        { "fieldPath": "period", "order": "ASCENDING" },
        { "fieldPath": "classDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "records",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "domain", "order": "ASCENDING" },
        { "fieldPath": "sequence", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "classes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "grade", "order": "ASCENDING" },
        { "fieldPath": "classNum", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### 5.3 인덱스 사용 시나리오

| 쿼리 시나리오 | 인덱스 | 사용 화면 |
|---|---|---|
| 특정 학급의 영역별 수업 기록 (최신순) | `records: domain ASC + date DESC` | 학급 페이지, 홈 |
| 특정 셀의 수업 기록 찾기 | `records: day + period + classDate` | 시간표 페이지 |
| 차시 번호 조회 | `records: domain + sequence` | 수업 기록 추가 시 |
| 학년별 학급 목록 (반 순서) | `classes: grade + classNum` | 학급 페이지, 시간표 |

---

## 6. localStorage → Firestore 마이그레이션 매핑표

### 6.1 전체 매핑

| localStorage 키 | Firestore 경로 | 변환 방식 |
|---|---|---|
| `pe_class_setup` | `users/{uid}` (`schoolLevel`, `grades` 필드) | 병합 (user 문서에 통합) |
| `pe_classes` | `users/{uid}/classes/{classId}` | 배열 → 개별 문서 |
| `pe_rosters` | `users/{uid}/classes/{classId}/roster/{studentId}` | 중첩 맵 → 서브컬렉션 문서 |
| `pe_class_records` | `users/{uid}/classes/{classId}/records/{recordId}` | 중첩 맵 → 서브컬렉션 문서 |
| `pe_timetable_base` | `users/{uid}/schedule/base` (`cells` 필드) | 맵 → 단일 문서 |
| `pe_timetable_weeks` | `users/{uid}/schedule/weeks/{weekKey}` | 중첩 맵 → 개별 문서 |
| `pe-teacher-settings` | `users/{uid}` (`settings` 필드) | 병합 (user 문서에 통합) |
| `pe_edited_ace_lessons` | `users/{uid}/editedLessons/{activityId}` | 맵 → 개별 문서 |
| `curriculum_my_activities_v1` | `users/{uid}/myActivities/{activityId}` | 맵 → 개별 문서 |
| `curriculum_custom_activities_v1` | `users/{uid}/curriculum/customActivities` | 그대로 단일 문서 |
| `curriculum_custom_alternative_ids_v1` | `users/{uid}/curriculum/customAlternatives` | 그대로 단일 문서 |

### 6.2 마이그레이션 코드 (pseudo-code)

```javascript
async function migrateLocalStorageToFirestore(uid) {
  const batch = writeBatch(db)
  const userRef = doc(db, 'users', uid)

  // 1. pe_class_setup + pe-teacher-settings → user 문서
  const classSetup = JSON.parse(localStorage.getItem('pe_class_setup') || 'null')
  const settings = JSON.parse(localStorage.getItem('pe-teacher-settings') || '{}')

  if (classSetup) {
    batch.set(userRef, {
      schoolLevel: classSetup.schoolLevel,
      grades: classSetup.grades,
      settings: settings,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  // 2. pe_classes → 개별 문서
  const classes = JSON.parse(localStorage.getItem('pe_classes') || '[]')
  for (const cls of classes) {
    const classRef = doc(db, 'users', uid, 'classes', cls.id)
    const { id, ...classData } = cls
    batch.set(classRef, {
      ...classData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  // 3. pe_rosters → 학급별 roster 서브컬렉션
  const rosters = JSON.parse(localStorage.getItem('pe_rosters') || '{}')
  for (const [classId, students] of Object.entries(rosters)) {
    for (const student of students) {
      const studentRef = doc(db, 'users', uid, 'classes', classId, 'roster', student.id)
      const { id, ...studentData } = student
      batch.set(studentRef, studentData)
    }
  }

  // 4. pe_class_records → 학급별 records 서브컬렉션
  const records = JSON.parse(localStorage.getItem('pe_class_records') || '{}')
  for (const [classId, classRecords] of Object.entries(records)) {
    for (const record of classRecords) {
      const recordRef = doc(db, 'users', uid, 'classes', classId, 'records', record.id)
      const { id, ...recordData } = record
      batch.set(recordRef, {
        ...recordData,
        createdAt: serverTimestamp(),
      })
    }
  }

  // 5. pe_timetable_base → schedule/base
  const baseTimetable = JSON.parse(localStorage.getItem('pe_timetable_base') || '{}')
  if (Object.keys(baseTimetable).length > 0) {
    const baseRef = doc(db, 'users', uid, 'schedule', 'base')
    batch.set(baseRef, { cells: baseTimetable, updatedAt: serverTimestamp() })
  }

  // 6. pe_timetable_weeks → schedule/weeks/{weekKey}
  const weekTimetables = JSON.parse(localStorage.getItem('pe_timetable_weeks') || '{}')
  for (const [weekKey, weekData] of Object.entries(weekTimetables)) {
    const weekRef = doc(db, 'users', uid, 'schedule', 'weeks', weekKey)
    batch.set(weekRef, { cells: weekData, updatedAt: serverTimestamp() })
  }

  // 7. pe_edited_ace_lessons → editedLessons/{activityId}
  const editedLessons = JSON.parse(localStorage.getItem('pe_edited_ace_lessons') || '{}')
  for (const [activityId, lesson] of Object.entries(editedLessons)) {
    const lessonRef = doc(db, 'users', uid, 'editedLessons', activityId)
    batch.set(lessonRef, {
      activityName: lesson.activityName,
      aceLesson: lesson.aceLesson,
      updatedAt: serverTimestamp(),
    })
  }

  // 8. curriculum_my_activities_v1 → myActivities/{activityId}
  const myActivities = JSON.parse(localStorage.getItem('curriculum_my_activities_v1') || '{}')
  for (const [activityId, activity] of Object.entries(myActivities)) {
    const actRef = doc(db, 'users', uid, 'myActivities', activityId)
    const { id, ...actData } = activity
    batch.set(actRef, { ...actData, updatedAt: serverTimestamp() })
  }

  // 9. curriculum_custom_* → curriculum/ 문서
  const customActivities = JSON.parse(
    localStorage.getItem('curriculum_custom_activities_v1') || '{}'
  )
  if (Object.keys(customActivities).length > 0) {
    const caRef = doc(db, 'users', uid, 'curriculum', 'customActivities')
    batch.set(caRef, { activities: customActivities, updatedAt: serverTimestamp() })
  }

  const customAlternatives = JSON.parse(
    localStorage.getItem('curriculum_custom_alternative_ids_v1') || '{}'
  )
  if (Object.keys(customAlternatives).length > 0) {
    const altRef = doc(db, 'users', uid, 'curriculum', 'customAlternatives')
    batch.set(altRef, { mappings: customAlternatives, updatedAt: serverTimestamp() })
  }

  // 실행 (Firestore batch는 최대 500개 연산)
  await batch.commit()

  // 성공 후 localStorage에 마이그레이션 완료 플래그
  localStorage.setItem('pe_migrated_to_firestore', JSON.stringify({
    uid,
    migratedAt: new Date().toISOString(),
  }))
}
```

> **주의**: Firestore batch는 최대 500개 연산을 지원합니다.
> 학급 수가 많거나 수업 기록이 많은 경우 여러 batch로 분할해야 합니다.
> 실제 구현 시 `commitBatchChunked()` 유틸리티를 만들어 500개씩 나눠 commit하세요.

### 6.3 마이그레이션 후 정리

마이그레이션 성공 후 localStorage 데이터는 즉시 삭제하지 않습니다:

1. **마이그레이션 완료 플래그** 설정 (`pe_migrated_to_firestore`)
2. **7일간 localStorage 유지** (롤백 대비)
3. **7일 후** 설정 페이지에서 "로컬 데이터 삭제" 버튼 노출
4. **수동 삭제 확인** 후 localStorage 정리

---

## 7. 확장 고려사항

### 7.1 다중 교사 공유 시 변경 지점

현재 설계는 1인 교사 전용이지만, 다중 교사 공유(같은 학교 동료 체육교사 등)로 확장할 때 변경이 필요한 지점:

```
현재:  users/{uid}/classes/{classId}/...
미래:  schools/{schoolId}/classes/{classId}/...
       schools/{schoolId}/members/{uid} (역할: admin, teacher)
```

| 변경 항목 | 현재 설계 | 확장 설계 |
|---|---|---|
| 학급 소유권 | `users/{uid}` 하위 | `schools/{schoolId}` 하위, 멤버 목록으로 접근 제어 |
| 시간표 공유 | 교사 개인별 | 학교 단위 마스터 시간표 + 교사별 오버라이드 |
| 수업 기록 열람 | 본인만 | 같은 학교 교사 간 열람 (Security Rules 변경) |
| 학생 명단 | 본인만 | 학교 관리자 + 해당 반 교사 |
| 활동 DB 공유 | `myActivities` 개인용 | `schools/{schoolId}/sharedActivities/` 추가 |

### 7.2 확장 시 Security Rules 변경 예시

```javascript
// 학교 멤버인지 확인
function isSchoolMember(schoolId) {
  return exists(/databases/$(database)/documents/schools/$(schoolId)/members/$(request.auth.uid));
}

match /schools/{schoolId}/classes/{classId} {
  allow read: if isSchoolMember(schoolId);
  allow write: if isSchoolMember(schoolId)
    && get(/databases/$(database)/documents/schools/$(schoolId)/members/$(request.auth.uid))
       .data.role in ['admin', 'teacher'];
}
```

### 7.3 모듈 데이터 Firestore 전환 (Phase 3.5)

현재 클라이언트 JSON으로 유지하는 모듈 데이터를 Firestore로 전환하면:

```
modules/                          ← 최상위 컬렉션 (모든 교사 공유)
├── structures/{structureId}
├── skills/{skillId}
├── modifiers/{modifierId}
└── sports/{sportId}

taxonomy/                         ← 최상위 컬렉션
├── fms/{category}
└── curriculum/{gradeBand}
```

**장점**: 앱 배포 없이 데이터 업데이트, 교사별 커스텀 모듈 가능
**단점**: 읽기 비용 증가, 오프라인 지원 복잡도 증가

**권장**: Phase 3.5까지는 클라이언트 JSON 유지, 커뮤니티 기능(Phase 5) 도입 시 전환

### 7.4 Phase 4 RAG 대비

```
users/{uid}/classes/{classId}/records → Phase 4에서 LLM 학습 데이터로 활용

향후 추가:
knowledge/                        ← 최상위 컬렉션
├── documents/{docId}             ← PDF 청크
│   └── (필드: content, embedding, source, chunkIndex)
└── embeddings/{embeddingId}      ← 벡터 인덱스 (별도 서비스)
```

---

## 8. 비용 최적화 전략

### 8.1 Firestore 무료 할당량

| 항목 | 일일 무료 | 예상 사용량 (1인 교사) |
|---|---|---|
| 읽기 | 50,000 | ~200~500 (여유 충분) |
| 쓰기 | 20,000 | ~50~100 (여유 충분) |
| 삭제 | 20,000 | ~10 (거의 없음) |
| 저장 | 1GB | ~10MB 이하 |

### 8.2 읽기 절약 전략

#### (1) 로컬 캐시 우선 (onSnapshot + persistence)

```javascript
// Firestore 오프라인 persistence 활성화
import { enableIndexedDbPersistence } from 'firebase/firestore'
enableIndexedDbPersistence(db)
```

- Firestore SDK의 IndexedDB 캐시를 활용
- 오프라인에서도 앱 사용 가능 (운동장에서 Wi-Fi 없을 때)
- 온라인 복귀 시 자동 동기화

#### (2) 실시간 리스너 최소화

```javascript
// BAD: 모든 데이터에 실시간 리스너
onSnapshot(collection(db, 'users', uid, 'classes'), ...)  // 불필요한 리스너

// GOOD: 필요한 화면에서만 리스너, 나머지는 getDoc
const classSnap = await getDoc(doc(db, 'users', uid, 'classes', classId))
```

| 데이터 | 방식 | 이유 |
|---|---|---|
| 학급 목록 | `getDoc` (1회 로드) | 자주 변경되지 않음 |
| 학생 명단 | `getDoc` (학급 선택 시) | 편집 시에만 필요 |
| 수업 기록 | `getDoc` (학급 선택 시) | 목록 조회 후 개별 편집 |
| 시간표 base | `onSnapshot` (실시간) | 시간표 페이지에서 실시간 반영 필요 |
| 시간표 week | `getDoc` (주 변경 시) | 주 단위로 변경 |

#### (3) 문서 크기 최적화

- `schedule/base`에 모든 시간표 셀을 하나의 `cells` 맵으로 저장 → 1회 읽기로 전체 시간표 로드
- `records`는 서브컬렉션으로 분리 → 학급 선택 시에만 로드, 페이지네이션 가능

#### (4) 쿼리 범위 제한

```javascript
// 최근 수업 기록 10개만 로드
const q = query(
  collection(db, 'users', uid, 'classes', classId, 'records'),
  orderBy('date', 'desc'),
  limit(10)
)
```

### 8.3 쓰기 절약 전략

#### (1) 배치 쓰기 활용

```javascript
// 명단 일괄 업데이트 시 batch 사용
const batch = writeBatch(db)
updatedStudents.forEach(student => {
  const ref = doc(db, 'users', uid, 'classes', classId, 'roster', student.id)
  batch.set(ref, student)
})
await batch.commit()  // 1회 네트워크 요청
```

#### (2) 디바운스 쓰기

```javascript
// 시간표 편집 시 매 셀 변경마다 쓰기 X
// 300ms 디바운스로 마지막 변경만 저장
const debouncedSave = useDebouncedCallback((cells) => {
  setDoc(doc(db, 'users', uid, 'schedule', 'base'), {
    cells,
    updatedAt: serverTimestamp()
  })
}, 300)
```

#### (3) 불필요한 필드 업데이트 방지

```javascript
// BAD: 전체 문서 덮어쓰기
await setDoc(classRef, fullClassData)

// GOOD: 변경된 필드만 업데이트
await updateDoc(classRef, {
  lastActivity: record.activity,
  lastDate: record.date,
  updatedAt: serverTimestamp()
})
```

### 8.4 비용 시나리오 분석

**일반적인 교사 하루 사용 패턴:**

| 행동 | 읽기 | 쓰기 |
|---|---|---|
| 아침 앱 실행 (학급 + 시간표 + 설정 로드) | ~10 | 0 |
| 시간표 확인/수정 | ~5 | ~3 |
| 수업 3건 기록 | ~15 | ~6 |
| 학급 페이지 열람 | ~10 | 0 |
| 교육과정 페이지 열람 | ~5 | 0 |
| **일일 합계** | **~45** | **~9** |

> 무료 할당량(읽기 50K, 쓰기 20K) 대비 0.1% 미만 사용.
> 1인 교사 사용 시 무료 플랜으로 충분합니다.

---

## 부록: 훅 전환 가이드

### 기존 훅 → Firestore 훅 전환 방향

각 훅의 `useLocalStorage` 호출을 Firestore 접근으로 교체합니다.
**외부 인터페이스(return 값)는 동일하게 유지**하여 페이지/컴포넌트 코드 변경을 최소화합니다.

| 기존 훅 | 내부 변경 | 외부 인터페이스 |
|---|---|---|
| `useClassManager` | `useLocalStorage` → `onSnapshot` + `setDoc` | 동일 유지 |
| `useSchedule` | `useLocalStorage` → `getDoc/setDoc` | 동일 유지 |
| `useSettings` | `useLocalStorage` → user 문서 `settings` 필드 | 동일 유지 |
| `useEditedAceLesson` | `useLocalStorage` → `editedLessons` 서브컬렉션 | 동일 유지 |
| `useCurriculum` | localStorage 부분만 → `myActivities` 서브컬렉션 | 동일 유지 |

### 전환 전략: 어댑터 패턴

```javascript
// useDataSource.js — localStorage/Firestore 투명 전환 어댑터
export function useDataSource(key, initialValue, firestorePath) {
  const auth = useAuth()

  if (auth.user) {
    // Firestore 모드
    return useFirestoreDoc(firestorePath, initialValue)
  } else {
    // localStorage 모드 (미인증 시 폴백)
    return useLocalStorage(key, initialValue)
  }
}
```

이 어댑터를 사용하면 인증 전에는 localStorage, 인증 후에는 Firestore를 자동으로 선택합니다.
기존 훅 코드의 변경을 최소화하면서 점진적으로 전환할 수 있습니다.
