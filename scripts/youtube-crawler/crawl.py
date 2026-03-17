"""
양수쌤체육수업 YouTube 크롤러
- yt-dlp로 메타데이터 추출
- youtube-transcript-api로 한국어 자막 추출
- 중단 시 이어하기 지원 (progress.json)
"""
import json
import re
import time
import random
import sys
from urllib.parse import urlparse, parse_qs

from yt_dlp import YoutubeDL
from youtube_transcript_api import YouTubeTranscriptApi
from tqdm import tqdm

from config import (
    VIDEOS_TXT, SHORTS_TXT,
    VIDEOS_JSON, PROGRESS_JSON, ERRORS_JSON,
    MIN_DELAY, MAX_DELAY, BATCH_SIZE,
    RAW_DIR,
)


def extract_video_id(url: str) -> str | None:
    """URL에서 video_id 추출"""
    url = url.strip()
    if not url:
        return None

    # shorts URL
    if "/shorts/" in url:
        match = re.search(r"/shorts/([a-zA-Z0-9_-]{11})", url)
        return match.group(1) if match else None

    # 일반 URL
    parsed = urlparse(url)
    if parsed.hostname in ("www.youtube.com", "youtube.com"):
        qs = parse_qs(parsed.query)
        vid = qs.get("v", [None])[0]
        return vid
    elif parsed.hostname == "youtu.be":
        return parsed.path.lstrip("/")[:11]

    return None


def load_video_ids() -> list[dict]:
    """두 txt 파일에서 video_id 추출"""
    videos = []
    seen = set()

    # 일반 영상
    if VIDEOS_TXT.exists():
        for line in VIDEOS_TXT.read_text(encoding="utf-8").splitlines():
            vid = extract_video_id(line)
            if vid and vid not in seen:
                seen.add(vid)
                videos.append({"video_id": vid, "is_short": False, "source_url": line.strip()})

    # 쇼츠
    if SHORTS_TXT.exists():
        for line in SHORTS_TXT.read_text(encoding="utf-8").splitlines():
            vid = extract_video_id(line)
            if vid and vid not in seen:
                seen.add(vid)
                videos.append({"video_id": vid, "is_short": True, "source_url": line.strip()})

    return videos


def load_progress() -> dict:
    """진행 상황 로드"""
    if PROGRESS_JSON.exists():
        return json.loads(PROGRESS_JSON.read_text(encoding="utf-8"))
    return {"completed": [], "total": 0}


def save_progress(progress: dict):
    """진행 상황 저장"""
    PROGRESS_JSON.write_text(json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8")


def load_results() -> list[dict]:
    """기존 결과 로드"""
    if VIDEOS_JSON.exists():
        return json.loads(VIDEOS_JSON.read_text(encoding="utf-8"))
    return []


def save_results(results: list[dict]):
    """결과 저장"""
    VIDEOS_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")


def load_errors() -> list[dict]:
    """에러 목록 로드"""
    if ERRORS_JSON.exists():
        return json.loads(ERRORS_JSON.read_text(encoding="utf-8"))
    return []


def save_errors(errors: list[dict]):
    """에러 목록 저장"""
    ERRORS_JSON.write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")


def fetch_metadata(video_id: str) -> dict | None:
    """yt-dlp로 메타데이터 추출 (다운로드 없이)"""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(
                f"https://www.youtube.com/watch?v={video_id}",
                download=False,
            )
            return {
                "title": info.get("title", ""),
                "description": info.get("description", ""),
                "upload_date": info.get("upload_date", ""),
                "duration": info.get("duration", 0),
                "view_count": info.get("view_count", 0),
                "channel": info.get("channel", ""),
                "tags": info.get("tags", []),
            }
    except Exception as e:
        return None


def fetch_transcript(video_id: str) -> str | None:
    """한국어 자막 추출 (v1.x 인스턴스 API)"""
    try:
        api = YouTubeTranscriptApi()
        result = api.fetch(video_id, languages=["ko"])
        texts = [snippet.text for snippet in result]
        return " ".join(texts) if texts else None
    except Exception:
        return None


def crawl_single(video_id: str, is_short: bool) -> dict:
    """단일 영상 크롤링"""
    result = {
        "video_id": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "is_short": is_short,
    }

    # 메타데이터
    meta = fetch_metadata(video_id)
    if meta:
        result.update(meta)
    else:
        result["title"] = ""
        result["description"] = ""
        result["_meta_error"] = True

    # 자막
    transcript = fetch_transcript(video_id)
    result["transcript"] = transcript or ""
    result["has_transcript"] = transcript is not None

    return result


def crawl_all():
    """전체 크롤링 실행"""
    # video_id 목록 로드
    all_videos = load_video_ids()
    print(f"총 {len(all_videos)}개 영상 발견")

    # 진행 상황 확인
    progress = load_progress()
    completed_ids = set(progress.get("completed", []))
    results = load_results()
    errors = load_errors()

    # 미완료 영상 필터링
    remaining = [v for v in all_videos if v["video_id"] not in completed_ids]
    print(f"이미 완료: {len(completed_ids)}개, 남은 영상: {len(remaining)}개")

    if not remaining:
        print("모든 영상이 이미 크롤링되었습니다!")
        return

    # 크롤링 실행
    new_count = 0
    for item in tqdm(remaining, desc="크롤링 중"):
        vid = item["video_id"]
        is_short = item["is_short"]

        try:
            result = crawl_single(vid, is_short)
            results.append(result)
            completed_ids.add(vid)
            new_count += 1

            # 주기적 저장
            if new_count % BATCH_SIZE == 0:
                save_results(results)
                progress["completed"] = list(completed_ids)
                progress["total"] = len(all_videos)
                save_progress(progress)
                tqdm.write(f"  [저장] {new_count}개 완료, 총 {len(results)}개")

        except Exception as e:
            errors.append({"video_id": vid, "error": str(e)})
            tqdm.write(f"  [에러] {vid}: {e}")

        # 랜덤 딜레이 (차단 방지)
        time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))

    # 최종 저장
    save_results(results)
    progress["completed"] = list(completed_ids)
    progress["total"] = len(all_videos)
    save_progress(progress)
    save_errors(errors)

    # 결과 요약
    with_transcript = sum(1 for r in results if r.get("has_transcript"))
    print(f"\n=== 크롤링 완료 ===")
    print(f"총 영상: {len(results)}개")
    print(f"자막 있음: {with_transcript}개 ({with_transcript/len(results)*100:.1f}%)")
    print(f"자막 없음: {len(results) - with_transcript}개")
    print(f"에러: {len(errors)}개")


def crawl_test(video_id: str, is_short: bool = False):
    """단일 영상 테스트 크롤링"""
    print(f"테스트 크롤링: {video_id}")
    result = crawl_single(video_id, is_short)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        # 테스트 모드: python crawl.py --test VIDEO_ID
        vid = sys.argv[2] if len(sys.argv) > 2 else "ocHqauUSBbw"
        is_short = "--short" in sys.argv
        crawl_test(vid, is_short)
    else:
        crawl_all()
