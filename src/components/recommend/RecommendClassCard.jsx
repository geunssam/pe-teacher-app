// 학급별 추천 카드 — 지난수업 → 추천활동 → 이유 → AI버튼 | 사용처→RecommendPage
import { useState } from 'react'
import GlassCard from '../common/GlassCard'
import AIButton from '../common/AIButton'
import DomainBalanceChart from './DomainBalanceChart'
import SpecialEventBanner from './SpecialEventBanner'

const DOMAIN_COLORS = {
  '운동': '#F57C7C',
  '스포츠': '#7C9EF5',
  '표현': '#A78BFA',
}

const WEEKDAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' }

/**
 * 단일 학급의 추천 정보를 표시하는 카드
 *
 * @param {{ data: Object, onAIRecommend: Function, aiResult: string|null, aiLoading: boolean }} props
 */
export default function RecommendClassCard({ data, onAIRecommend, aiResult, aiLoading }) {
  const [showBalance, setShowBalance] = useState(false)

  if (!data) return null

  const { classInfo, period, day, isSkipped, skipReason, skipMessage, adjustMessage, specialMessage, lastLesson, domainBalance, recommendation } = data

  // 행사로 수업 없음
  if (isSkipped) {
    return (
      <SpecialEventBanner
        type="skip"
        message={skipMessage || `${skipReason}으로 체육 수업이 없습니다.`}
        period={period}
        classInfo={classInfo}
      />
    )
  }

  const dayLabel = WEEKDAY_LABELS[day] || day
  const domainColor = recommendation ? DOMAIN_COLORS[recommendation.domain] || '#7C9EF5' : '#7C9EF5'

  return (
    <GlassCard accent="recommend" className="relative">
      {/* 헤더: 교시 + 학급 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: classInfo.color || '#7C9EF5' }}
          >
            {classInfo.classNum}
          </span>
          <div>
            <span className="text-sm font-bold text-text">
              {period}교시 · {classInfo.grade} {classInfo.classNum}반
            </span>
            {day && (
              <span className="text-xs text-textMuted ml-1.5">({dayLabel})</span>
            )}
          </div>
        </div>
        {/* 영역 균형 토글 */}
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="text-[10px] text-textMuted hover:text-text transition-colors px-2 py-1 rounded-md hover:bg-white/40"
        >
          {showBalance ? '닫기' : '영역 분포'}
        </button>
      </div>

      {/* 조정/특별 알림 (대피훈련, 공개수업 등) */}
      {adjustMessage && (
        <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-xs">
          <span>⚠️</span>
          <span className="font-medium" style={{ color: '#EA580C' }}>{adjustMessage}</span>
        </div>
      )}
      {specialMessage && (
        <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
          <span>🎯</span>
          <span className="font-medium" style={{ color: '#7C9EF5' }}>{specialMessage}</span>
        </div>
      )}

      {/* 영역 균형 차트 (접기/펼치기) */}
      {showBalance && (
        <div className="mb-3 p-2.5 bg-white/30 rounded-lg border border-white/40">
          <DomainBalanceChart domainBalance={domainBalance} />
        </div>
      )}

      {/* 지난 수업 요약 */}
      {lastLesson && (
        <div className="text-xs text-textMuted mb-2.5 flex items-center gap-1.5">
          <span className="text-[10px]">📝</span>
          <span>
            지난 수업: {lastLesson.activity}
            <span
              className="ml-1 font-medium"
              style={{ color: DOMAIN_COLORS[lastLesson.domain] || '#7C9EF5' }}
            >
              ({lastLesson.domain} {lastLesson.sequence}차시)
            </span>
          </span>
        </div>
      )}

      {!lastLesson && (
        <div className="text-xs text-textMuted mb-2.5 flex items-center gap-1.5">
          <span className="text-[10px]">📝</span>
          <span>수업 기록이 아직 없습니다</span>
        </div>
      )}

      {/* 추천 활동 카드 */}
      {recommendation ? (
        <div className="p-3 rounded-xl bg-white/40 border border-white/60">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-sm font-bold text-text mb-0.5">
                {recommendation.activity}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-white"
                  style={{ backgroundColor: domainColor }}
                >
                  {recommendation.domain}
                </span>
                {recommendation.acePhase && (
                  <span className="text-[10px] text-textMuted font-medium">
                    {recommendation.acePhase}단계
                  </span>
                )}
                <span className="text-[10px] text-textMuted">
                  {recommendation.space}
                </span>
              </div>
            </div>
          </div>

          {/* 추천 사유 */}
          <p className="text-xs text-textMuted mb-2.5 leading-relaxed">
            "{recommendation.rationale}"
          </p>

          {/* 대체 활동 */}
          {recommendation.alternatives?.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-textMuted mb-3">
              <span>대체:</span>
              {recommendation.alternatives.map((alt, idx) => (
                <span key={idx} className="px-1.5 py-0.5 bg-white/50 rounded border border-white/60">
                  {alt.name}
                </span>
              ))}
            </div>
          )}

          {/* AI 추천 버튼 */}
          <AIButton
            label="AI 추천 받기"
            loading={aiLoading}
            onClick={() => onAIRecommend?.(data.classId)}
            size="sm"
          />

          {/* AI 추천 결과 */}
          {aiResult && (
            <div className="mt-3 p-2.5 bg-purple-50/50 rounded-lg border border-purple-100/50 text-xs text-text leading-relaxed whitespace-pre-wrap">
              {aiResult}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-white/30 border border-white/40 text-xs text-textMuted text-center">
          이 학년의 활동 데이터가 없습니다
        </div>
      )}
    </GlassCard>
  )
}
