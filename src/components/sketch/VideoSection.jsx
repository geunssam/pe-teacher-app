/**
 * @status DORMANT
 * @reason YouTube Data API v3 미구현 (Phase 5 예정)
 * @usage 현재 어디서도 import되지 않음. Phase 5에서 활성화 예정.
 */

/**
 * 양수쌤 유튜브 영상 섹션
 * Mock: 채널 내 검색 URL 생성
 * Phase 2: YouTube Data API v3 연동 예정
 */
export default function VideoSection({ activity }) {
  if (!activity || !activity.youtubeKeyword) return null

  // 양수쌤 채널 ID
  const CHANNEL_ID = 'UCrFNcTAsT8uv2otdMUf_rwg'

  // 채널 내 검색 URL 생성
  const searchUrl = `https://www.youtube.com/@양수쌤체육수업/search?query=${encodeURIComponent(
    activity.youtubeKeyword
  )}`

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
      <div className="flex items-center justify-between mb-md">
        <h3 className="text-card-title">▶️ 관련 영상</h3>
        <span className="text-caption text-muted">양수쌤 체육수업</span>
      </div>

      <div className="mb-md p-md bg-primary/10 rounded-xl border border-primary/30">
        <div className="flex items-start gap-2">
          <span className="text-xl">💡</span>
          <div className="flex-1">
            <div className="text-body font-semibold text-primary mb-xs">
              프로토타입 Mock 링크
            </div>
            <div className="text-caption text-text">
              Phase 2에서 YouTube Data API v3를 연동하여 실제 영상 목록을 표시할 예정입니다.
            </div>
          </div>
        </div>
      </div>

      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-lg bg-white/60 rounded-xl border border-white/80 hover:bg-white/80 transition-all"
      >
        <div className="flex items-center gap-md">
          <div className="w-16 h-16 bg-danger/10 rounded-lg flex items-center justify-center text-3xl">
            ▶️
          </div>
          <div className="flex-1">
            <div className="text-body-bold text-text mb-xs">
              "{activity.youtubeKeyword}" 검색하기
            </div>
            <div className="text-caption text-muted">
              양수쌤 채널에서 관련 영상 보기 →
            </div>
          </div>
        </div>
      </a>
    </div>
  )
}
