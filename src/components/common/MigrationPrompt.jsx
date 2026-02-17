/**
 * MigrationPrompt - localStorage → Firestore 마이그레이션 안내 모달
 *
 * 기존 데이터 요약 표시 + 이전 / 건너뛰기 / 새로 시작 선택.
 * 이전 진행 중에는 프로그레스 바 표시.
 */
import { useState } from 'react';
import Modal from './Modal';
import { getMigrationSummary, migrateLocalStorageToFirestore } from '../../services/migration';

export default function MigrationPrompt({ uid, onComplete }) {
  const [phase, setPhase] = useState('confirm'); // confirm | migrating | done | error
  const [progress, setProgress] = useState({ step: 0, total: 1, message: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const summary = getMigrationSummary();

  const handleMigrate = async () => {
    setPhase('migrating');
    const result = await migrateLocalStorageToFirestore(uid, setProgress);
    if (result.success) {
      setPhase('done');
      setTimeout(() => onComplete('migrated'), 1200);
    } else {
      setErrorMsg(result.error || '알 수 없는 오류');
      setPhase('error');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('pe_migrated_to_firestore', 'skipped');
    onComplete('skipped');
  };

  const handleFresh = () => {
    localStorage.setItem('pe_migrated_to_firestore', 'fresh');
    onComplete('fresh');
  };

  const pct = Math.round((progress.step / progress.total) * 100);

  // ── 확인 화면 ───────────────────────────────────────
  if (phase === 'confirm') {
    return (
      <Modal onClose={handleSkip} maxWidth="max-w-sm">
        <div className="text-center space-y-4">
          <div className="text-3xl">
            <span role="img" aria-label="data">📦</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            기존 데이터가 있습니다
          </h2>
          <p className="text-sm text-gray-600">
            이 기기에 저장된 데이터를 클라우드로 옮기면
            <br />
            다른 기기에서도 사용할 수 있습니다.
          </p>

          {/* 데이터 요약 */}
          <div className="glass-card p-3 text-left text-sm space-y-1">
            {summary.classCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">학급</span>
                <span className="font-medium">{summary.classCount}개</span>
              </div>
            )}
            {summary.recordCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">수업 기록</span>
                <span className="font-medium">{summary.recordCount}건</span>
              </div>
            )}
            {summary.weekCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">주차별 시간표</span>
                <span className="font-medium">{summary.weekCount}주</span>
              </div>
            )}
            {summary.hasTimetable && (
              <div className="flex justify-between">
                <span className="text-gray-500">기본 시간표</span>
                <span className="font-medium">있음</span>
              </div>
            )}
            {summary.hasSettings && (
              <div className="flex justify-between">
                <span className="text-gray-500">설정</span>
                <span className="font-medium">있음</span>
              </div>
            )}
            {summary.editedLessonCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">편집된 수업</span>
                <span className="font-medium">{summary.editedLessonCount}개</span>
              </div>
            )}
            {summary.myActivityCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">내 활동</span>
                <span className="font-medium">{summary.myActivityCount}개</span>
              </div>
            )}
            {summary.customActivityCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">커스텀 활동</span>
                <span className="font-medium">{summary.customActivityCount}개</span>
              </div>
            )}
          </div>

          {/* 버튼 그룹 */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleMigrate}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7C9EF5, #A78BFA)' }}
            >
              클라우드로 이전하기
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              나중에 하기
            </button>
            <button
              onClick={handleFresh}
              className="w-full py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              새로 시작 (기존 데이터 무시)
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── 진행 중 화면 ────────────────────────────────────
  if (phase === 'migrating') {
    return (
      <Modal maxWidth="max-w-sm">
        <div className="text-center space-y-4 py-2">
          <div className="text-3xl animate-pulse">
            <span role="img" aria-label="cloud">☁️</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            데이터 이전 중...
          </h2>
          <p className="text-sm text-gray-500">{progress.message}</p>

          {/* 프로그레스 바 */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #7C9EF5, #A78BFA)',
              }}
            />
          </div>
          <p className="text-xs text-gray-400">
            {progress.step} / {progress.total}
          </p>
        </div>
      </Modal>
    );
  }

  // ── 완료 화면 ───────────────────────────────────────
  if (phase === 'done') {
    return (
      <Modal maxWidth="max-w-sm">
        <div className="text-center space-y-3 py-2">
          <div className="text-3xl">
            <span role="img" aria-label="check">✅</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">이전 완료!</h2>
          <p className="text-sm text-gray-500">
            모든 데이터가 클라우드에 안전하게 저장되었습니다.
          </p>
        </div>
      </Modal>
    );
  }

  // ── 오류 화면 ───────────────────────────────────────
  if (phase === 'error') {
    return (
      <Modal onClose={handleSkip} maxWidth="max-w-sm">
        <div className="text-center space-y-4 py-2">
          <div className="text-3xl">
            <span role="img" aria-label="warning">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">이전 실패</h2>
          <p className="text-sm text-gray-500">
            데이터 이전 중 오류가 발생했습니다.
            <br />
            다시 시도하거나 나중에 진행해 주세요.
          </p>
          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-50 rounded-lg p-2 break-all">
              {errorMsg}
            </p>
          )}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleMigrate}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7C9EF5, #A78BFA)' }}
            >
              다시 시도
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              나중에 하기
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
}
