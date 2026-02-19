/**
 * localStorage -> Firestore 마이그레이션 서비스
 *
 * 기존 localStorage 데이터를 Firestore로 일괄 이전.
 * writeBatch 500건 단위 청킹, 진행률 콜백 지원.
 */
import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ── 마이그레이션 대상 localStorage 키 ──────────────────────
const LOCAL_KEYS = [
  'pe_class_setup',
  'pe_classes',
  'pe_rosters',
  'pe_class_records',
  'pe_timetable_base',
  'pe_timetable_weeks',
  'pe-teacher-settings',
  'pe_edited_ace_lessons',
  'curriculum_my_activities_v1',
  'curriculum_custom_activities_v1',
  'curriculum_custom_alternative_ids_v1',
];

const MIGRATION_FLAG = 'pe_migrated_to_firestore';
const BATCH_LIMIT = 500;

// ── 헬퍼 ──────────────────────────────────────────────────

/** localStorage 값 안전 파싱 */
function safeParse(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** 배열을 size 단위 청크로 분할 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── 공개 API ──────────────────────────────────────────────

/** 마이그레이션 대상 요약 (UI 표시용) */
export function getMigrationSummary() {
  const classes = safeParse('pe_classes', []);
  const records = safeParse('pe_class_records', {});
  const totalRecords = Object.values(records).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0,
  );
  const weeks = safeParse('pe_timetable_weeks', {});
  const editedLessons = safeParse('pe_edited_ace_lessons', {});
  const myActivities = safeParse('curriculum_my_activities_v1', []);
  const customActivities = safeParse('curriculum_custom_activities_v1', []);

  return {
    classCount: classes.length,
    recordCount: totalRecords,
    weekCount: Object.keys(weeks).length,
    hasSettings: !!localStorage.getItem('pe-teacher-settings'),
    hasTimetable: !!localStorage.getItem('pe_timetable_base'),
    editedLessonCount: Object.keys(editedLessons).length,
    myActivityCount: Array.isArray(myActivities) ? myActivities.length : 0,
    customActivityCount: Array.isArray(customActivities) ? customActivities.length : 0,
  };
}

// ── 메인 마이그레이션 ─────────────────────────────────────

/**
 * localStorage 전체 데이터를 Firestore로 이전
 *
 * @param {string} uid - Firebase Auth UID
 * @param {(progress: {step: number, total: number, message: string}) => void} onProgress
 */
export async function migrateLocalStorageToFirestore(uid, onProgress = () => {}) {
  const userRef = doc(db, 'users', uid);
  const totalSteps = 8;
  let currentStep = 0;

  const report = (message) => {
    currentStep++;
    onProgress({ step: currentStep, total: totalSteps, message });
  };

  try {
    // ── 1. 사용자 설정 (config + settings) ──────────────
    report('설정 데이터 이전 중...');

    const classSetup = safeParse('pe_class_setup', {});
    const settings = safeParse('pe-teacher-settings', {});

    await setDoc(userRef, {
      config: classSetup,
      settings,
      migratedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });

    // ── 2. 기본 시간표 ──────────────────────────────────
    report('시간표 이전 중...');

    const timetableBase = safeParse('pe_timetable_base', null);
    if (timetableBase) {
      await setDoc(doc(db, 'users', uid, 'schedule', 'base'), {
        grid: timetableBase,
        updatedAt: serverTimestamp(),
      });
    }

    // ── 3. 주차별 시간표 ────────────────────────────────
    report('주차별 시간표 이전 중...');

    const timetableWeeks = safeParse('pe_timetable_weeks', {});
    const weekEntries = Object.entries(timetableWeeks);

    if (weekEntries.length > 0) {
      const weekChunks = chunkArray(weekEntries, BATCH_LIMIT);
      for (const chunk of weekChunks) {
        const batch = writeBatch(db);
        for (const [weekKey, weekData] of chunk) {
          batch.set(
            doc(db, 'users', uid, 'schedule', `week_${weekKey}`),
            { grid: weekData, weekKey, updatedAt: serverTimestamp() },
          );
        }
        await batch.commit();
      }
    }

    // ── 4. 학급 목록 ────────────────────────────────────
    report('학급 데이터 이전 중...');

    const classes = safeParse('pe_classes', []);
    const rosters = safeParse('pe_rosters', {});
    const records = safeParse('pe_class_records', {});

    // 배치 쓰기용 작업(op) 수집
    const classOps = [];

    for (const cls of classes) {
      // 학급 문서
      classOps.push({
        ref: doc(db, 'users', uid, 'classes', cls.id),
        data: {
          name: cls.name || '',
          grade: cls.grade ?? null,
          classNum: cls.classNum ?? null,
          color: cls.color || '',
          lastActivity: cls.lastActivity || '',
          studentCount: cls.studentCount ?? 0,
          createdAt: serverTimestamp(),
        },
      });

      // 학생 명단
      const rosterList = rosters[cls.id] || [];
      for (const student of rosterList) {
        const studentId = student.id || `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        classOps.push({
          ref: doc(db, 'users', uid, 'classes', cls.id, 'roster', studentId),
          data: {
            name: student.name || '',
            number: student.number ?? null,
            memo: student.memo || '',
          },
        });
      }

      // 수업 기록
      const classRecords = records[cls.id] || [];
      for (const rec of classRecords) {
        const recId = rec.id || `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        classOps.push({
          ref: doc(db, 'users', uid, 'classes', cls.id, 'records', recId),
          data: {
            date: rec.date || '',
            classDate: rec.classDate || rec.date || '',
            activity: rec.activity || '',
            domain: rec.domain || '',
            sequence: rec.sequence ?? 0,
            day: rec.day ?? null,
            period: rec.period ?? null,
            memo: rec.memo || '',
            weather: rec.weather || null,
            outdoor: rec.outdoor ?? null,
            createdAt: serverTimestamp(),
          },
        });
      }
    }

    // 청킹 후 배치 커밋
    const classChunks = chunkArray(classOps, BATCH_LIMIT);
    for (const chunk of classChunks) {
      const batch = writeBatch(db);
      for (const op of chunk) {
        batch.set(op.ref, op.data);
      }
      await batch.commit();
    }

    // ── 5. 편집된 ACE 수업 ──────────────────────────────
    report('편집된 수업 데이터 이전 중...');

    const editedLessons = safeParse('pe_edited_ace_lessons', {});
    const lessonEntries = Object.entries(editedLessons);

    if (lessonEntries.length > 0) {
      const lessonChunks = chunkArray(lessonEntries, BATCH_LIMIT);
      for (const chunk of lessonChunks) {
        const batch = writeBatch(db);
        for (const [activityId, lessonData] of chunk) {
          batch.set(
            doc(db, 'users', uid, 'editedLessons', activityId),
            { ...lessonData, updatedAt: serverTimestamp() },
          );
        }
        await batch.commit();
      }
    }

    // ── 6. 내 활동 목록 ─────────────────────────────────
    report('커리큘럼 활동 이전 중...');

    const myActivities = safeParse('curriculum_my_activities_v1', []);
    if (Array.isArray(myActivities) && myActivities.length > 0) {
      await setDoc(doc(db, 'users', uid, 'curriculum', 'myActivities'), {
        ids: myActivities,
        updatedAt: serverTimestamp(),
      });
    }

    // ── 7. 커스텀 활동 + 대체 ID ────────────────────────
    report('커스텀 활동 이전 중...');

    const customActivities = safeParse('curriculum_custom_activities_v1', []);
    const customAlternativeIds = safeParse('curriculum_custom_alternative_ids_v1', {});

    if (Array.isArray(customActivities) && customActivities.length > 0) {
      const customChunks = chunkArray(customActivities, BATCH_LIMIT);
      for (const chunk of customChunks) {
        const batch = writeBatch(db);
        for (const activity of chunk) {
          const actId = activity.id || `ca_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          batch.set(
            doc(db, 'users', uid, 'curriculum', `custom_${actId}`),
            { ...activity, type: 'custom', updatedAt: serverTimestamp() },
          );
        }
        await batch.commit();
      }
    }

    if (customAlternativeIds && Object.keys(customAlternativeIds).length > 0) {
      await setDoc(doc(db, 'users', uid, 'curriculum', 'alternativeIds'), {
        mapping: customAlternativeIds,
        updatedAt: serverTimestamp(),
      });
    }

    // ── 8. 완료 플래그 ──────────────────────────────────
    report('마이그레이션 완료!');

    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());

    return { success: true };
  } catch (error) {
    console.error('[Migration] 마이그레이션 실패:', error);
    return { success: false, error: error.message };
  }
}
