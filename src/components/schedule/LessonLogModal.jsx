// 수업 기록 모달 — 날씨 추천 + ACE 흐름 + 기록 폼 | 부모→SchedulePage
import Modal from '../common/Modal'
import AceLessonFlow from '../curriculum/AceLessonFlow'
import AIButton from '../common/AIButton'
import { formatRecordDate } from '../../utils/recordDate'
import { LESSON_DOMAINS, parseEventTag } from '../../constants/lessonDefaults'
import { buildActivitySuggestionPrompt } from '../../services/aiPrompts'
import { getSuggestionSummary } from '../../utils/lessonSuggestions'

export default function LessonLogModal({
  target,
  form,
  onFormChange,
  pendingActivity,
  weekdayLabels,
  onClose,
  onSave,
  onDomainChange,
  onApplySuggestion,
  recommendation,
  ai,
}) {
  const existingRecord = target.existingRecord
  const aceSource = pendingActivity?.aceLesson || existingRecord?.aceLesson
  const isAceMode = !!aceSource
  const isViewingExisting = !!existingRecord

  // 행사 태그 감지
  const { eventLabel } = parseEventTag(target.periodData?.memo)

  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-4xl"
      contentClassName="max-h-[88vh] overflow-y-auto"
    >
      <h2 className="text-xl font-bold text-text mb-1">
        {isViewingExisting ? '수업 기록 보기' : '수업 기록'}
      </h2>
      <p className="text-xs text-textMuted mb-3">
        {target.className} · {weekdayLabels[target.day] || target.day}요일 · {target.period}교시
        <span className="ml-2">기록일 {formatRecordDate(target.recordedAt)}</span>
        {target.scheduledDate &&
        target.scheduledDate !== target.recordedAt ? (
          <span className="ml-2">수업일 {formatRecordDate(target.scheduledDate)}</span>
        ) : null}
      </p>

      {/* 행사 알림 배너 */}
      {eventLabel && !isViewingExisting && (
        <div className="mb-4 p-3 rounded-xl border border-[#F5E07C] bg-[#FFF9C4]/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">📌</span>
            <span className="text-sm font-bold text-[#8B7D00]">{eventLabel}</span>
          </div>
          <p className="text-xs text-[#92400E]">
            이 교시에 특별 행사가 예정되어 있습니다. 체육 수업이 진행된 경우에만 기록해주세요.
          </p>
        </div>
      )}

      {/* ACE 모드: ACE 수업 흐름 + 간소화된 폼 */}
      {isAceMode ? (
        <>
          <div className="mb-4 p-3 rounded-xl border border-[#7C9EF5]/30 bg-[#7C9EF5]/5">
            <AceLessonFlow aceLesson={aceSource} />
          </div>

          {isViewingExisting && (
            <div className="mb-4 p-3 rounded-lg border border-white/80 bg-white/60">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-xs text-textMuted block">활동명</span>
                  <span className="font-medium text-text">{existingRecord.activity}</span>
                </div>
                <div>
                  <span className="text-xs text-textMuted block">도메인</span>
                  <span className="font-medium text-text">{existingRecord.domain}</span>
                </div>
                <div>
                  <span className="text-xs text-textMuted block">차시</span>
                  <span className="font-medium text-text">{existingRecord.sequence}차시</span>
                </div>
              </div>
              {existingRecord.performance && (
                <div className="mt-2">
                  <span className="text-xs text-textMuted">평가: </span>
                  <span className="text-sm font-semibold text-primary">{existingRecord.performance}</span>
                </div>
              )}
              {existingRecord.memo && (
                <div className="mt-2">
                  <span className="text-xs text-textMuted">메모: </span>
                  <span className="text-sm text-text">{existingRecord.memo}</span>
                </div>
              )}
            </div>
          )}

          {!isViewingExisting && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-text mb-1">수업 활동명</label>
                  <input
                    value={form.activity}
                    onChange={(e) => onFormChange((prev) => ({ ...prev, activity: e.target.value }))}
                    placeholder="예: 빠르게 이어달리기"
                    className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-text mb-1">도메인</label>
                  <select
                    value={form.domain}
                    onChange={(e) => onDomainChange(e.target.value)}
                    className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {LESSON_DOMAINS.map((domain) => (
                      <option key={domain} value={domain}>{domain}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-text mb-1">차시 (도메인 누적)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.sequence}
                    onChange={(e) => onFormChange((prev) => ({ ...prev, sequence: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-text mb-1">간편 평가</label>
                  <div className="flex gap-sm">
                    {['상', '중', '하'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => onFormChange((prev) => ({ ...prev, performance: level }))}
                        className={`flex-1 py-2 rounded-lg font-semibold transition-all border ${
                          form.performance === level
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white/60 text-text border-white/80'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <label className="block text-sm font-semibold text-text mb-1">수업 메모</label>
                <textarea
                  value={form.memo}
                  onChange={(e) => onFormChange((prev) => ({ ...prev, memo: e.target.value }))}
                  placeholder="수업 메모, 반응, 특이사항"
                  className="w-full h-20 resize-none p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </>
          )}
        </>
      ) : (
        /* 일반 모드: 날씨 추천 + 전체 폼 */
        <>
          <div className="mb-4 p-3 rounded-lg border border-white/80 bg-white/60">
            <p className="text-sm font-semibold text-text mb-1">날씨 기반 활동 제안</p>
            <p className="text-sm text-text">{recommendation.text}</p>
            <p className="text-xs text-textMuted mt-1">
              {getSuggestionSummary(recommendation.data?.judgment)}
            </p>
            <div className="mt-3 max-h-20 overflow-y-auto">
              <p className="text-xs font-semibold text-text mb-2">추천 활동</p>
              <div className="flex flex-wrap gap-2">
                {recommendation.activities.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onApplySuggestion(suggestion)}
                    className="px-2.5 py-1.5 rounded-lg text-sm bg-white/80 border border-white/80 text-text hover:border-primary/60 hover:bg-primary/5 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* AI 추천 활동 */}
            <div className="mt-3 pt-3 border-t border-white/60">
              <div className="flex items-center gap-2 mb-2">
                <AIButton
                  label="AI 추천"
                  loading={ai.suggest.loading}
                  onClick={async () => {
                    const recentActs = ai.records
                      ?.flatMap((r) => r.records || [])
                      .slice(0, 10)
                      .map((r) => r.activity)
                      .filter(Boolean)
                    const prompt = buildActivitySuggestionPrompt({
                      domain: form.domain,
                      weather: recommendation.data?.weather
                        ? {
                            temperature: recommendation.data.weather.t1h,
                            condition: recommendation.data.judgment?.text,
                            pm10: recommendation.data.judgment?.checks?.pm10?.value,
                          }
                        : null,
                      grade: target.className,
                      recentActivities: recentActs,
                    })
                    const result = await ai.suggest.generate(prompt)
                    if (result) {
                      const items = result.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3)
                      ai.setSuggestions(items)
                    }
                  }}
                />
                {ai.suggest.error && (
                  <span className="text-[10px] text-red-400">{ai.suggest.error}</span>
                )}
              </div>
              {ai.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ai.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onApplySuggestion(s)}
                      className="px-2.5 py-1.5 rounded-lg text-sm border transition-all hover:scale-[1.02]"
                      style={{
                        backgroundColor: 'rgba(167, 139, 250, 0.08)',
                        borderColor: 'rgba(167, 139, 250, 0.2)',
                        color: '#5B21B6',
                      }}
                    >
                      &#10024; {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-text mb-1">수업 활동명</label>
              <input
                value={form.activity}
                onChange={(e) => onFormChange((prev) => ({ ...prev, activity: e.target.value }))}
                placeholder="예: 빠르게 이어달리기"
                className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-text mb-1">도메인</label>
              <select
                value={form.domain}
                onChange={(e) => onDomainChange(e.target.value)}
                className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {LESSON_DOMAINS.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-text mb-1">
                차시 (도메인 누적)
              </label>
              <input
                type="number"
                min="1"
                value={form.sequence}
                onChange={(e) => onFormChange((prev) => ({ ...prev, sequence: e.target.value }))}
                className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text mb-1">간편 평가</label>
              <div className="flex gap-sm">
                {['상', '중', '하'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onFormChange((prev) => ({ ...prev, performance: level }))}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-all border ${
                      form.performance === level
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white/60 text-text border-white/80'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-text mb-1">변형 사항</label>
              <textarea
                value={form.variation}
                onChange={(e) => onFormChange((prev) => ({ ...prev, variation: e.target.value }))}
                placeholder="예: 공 간격 3m, 3명 조 편성"
                className="w-full h-20 resize-none p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-text mb-1">수업 메모</label>
              <textarea
                value={form.memo}
                onChange={(e) => onFormChange((prev) => ({ ...prev, memo: e.target.value }))}
                placeholder="수업 메모, 반응, 특이사항"
                className="w-full h-20 resize-none p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 mt-4">
        {!isViewingExisting && (
          <button
            onClick={onSave}
            className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all"
            style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
          >
            수업 기록 저장
          </button>
        )}
        <button
          onClick={onClose}
          className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all bg-white/60 text-text border border-white/80"
        >
          닫기
        </button>
      </div>
    </Modal>
  )
}
