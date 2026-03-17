"""
Whisper + Structure 통합 파이프라인
- 1,405개 전체 영상에 Whisper 자막 추출 후 구조화
- 기존 YouTube 자막(19개)은 그대로 사용, 나머지는 Whisper로 추출
- WAV 파일은 처리 즉시 삭제하여 디스크 부담 최소화
"""
import json
import subprocess
import sys
import time
import shutil
from pathlib import Path

from config import VIDEOS_JSON, ACTIVITIES_JSON, STRUCTURED_DIR
from structure import structure_single

# Whisper 설정
WHISPER_CLI = "/opt/homebrew/bin/whisper-cli"
WHISPER_MODEL = str(Path.home() / ".whisper-cpp/models/ggml-large-v3-turbo.bin")
TEMP_DIR = Path(__file__).parent / "data" / "whisper_temp"

# 진행 상황 파일 (기존 progress.json과 별도)
WHISPER_PROGRESS = STRUCTURED_DIR / "whisper_progress.json"

# 재시도 설정
MAX_RETRIES = 3


# --- 진행 상황 관리 ---

def load_progress() -> dict:
    if WHISPER_PROGRESS.exists():
        return json.loads(WHISPER_PROGRESS.read_text(encoding="utf-8"))
    return {"completed": [], "failed": [], "stats": {"whisper": 0, "existing_transcript": 0, "no_transcript": 0}}


def save_progress(progress: dict):
    WHISPER_PROGRESS.write_text(
        json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# --- 결과 관리 ---

def load_activities() -> list[dict]:
    if ACTIVITIES_JSON.exists():
        return json.loads(ACTIVITIES_JSON.read_text(encoding="utf-8"))
    return []


def save_activities(activities: list[dict]):
    ACTIVITIES_JSON.write_text(
        json.dumps(activities, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# --- Whisper 자막 추출 ---

def download_audio(video_id: str) -> Path | None:
    """yt-dlp로 16kHz WAV 다운로드 (3회 재시도)"""
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    output_path = TEMP_DIR / f"{video_id}.wav"

    if output_path.exists():
        return output_path

    url = f"https://www.youtube.com/watch?v={video_id}"
    cmd = [
        "yt-dlp",
        "-x", "--audio-format", "wav",
        "--postprocessor-args", "ffmpeg:-ar 16000 -ac 1",
        "-o", str(output_path),
        url,
    ]

    for attempt in range(1, MAX_RETRIES + 1):
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0 and output_path.exists():
            return output_path
        if attempt < MAX_RETRIES:
            print(f"    [재시도 {attempt}/{MAX_RETRIES}] 다운로드 실패, 5초 후 재시도...")
            time.sleep(5)

    print(f"    [실패] 다운로드 3회 실패: {result.stderr[:150]}")
    return None


def extract_transcript(wav_path: Path) -> str:
    """whisper-cli로 한국어 자막 추출"""
    cmd = [
        WHISPER_CLI,
        "-m", WHISPER_MODEL,
        "-l", "ko",
        "--no-timestamps",
        "-f", str(wav_path),
    ]

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode == 0:
                transcript = result.stdout.strip()
                lines = [line.strip() for line in transcript.splitlines() if line.strip()]
                return " ".join(lines)
        except subprocess.TimeoutExpired:
            print(f"    [타임아웃] Whisper 처리 시간 초과")

        if attempt < MAX_RETRIES:
            print(f"    [재시도 {attempt}/{MAX_RETRIES}] Whisper 실패, 재시도...")
            time.sleep(2)

    print(f"    [실패] Whisper 3회 실패")
    return ""


def cleanup_wav(video_id: str):
    """WAV 파일 즉시 삭제"""
    wav_path = TEMP_DIR / f"{video_id}.wav"
    if wav_path.exists():
        wav_path.unlink()


# --- 단일 영상 처리 ---

def process_single(video: dict) -> dict:
    """한 영상의 전체 파이프라인: 자막 확보 → 구조화"""
    video_id = video["video_id"]
    transcript_source = "none"

    # 기존 YouTube 자막이 있으면 그대로 사용
    if video.get("has_transcript") and video.get("transcript", "").strip():
        transcript_source = "youtube"
        video_for_structure = video
    else:
        # Whisper로 자막 추출
        wav_path = download_audio(video_id)
        if wav_path:
            transcript = extract_transcript(wav_path)
            cleanup_wav(video_id)

            if transcript:
                transcript_source = "whisper"
                video_for_structure = {
                    **video,
                    "transcript": transcript,
                    "has_transcript": True,
                }
            else:
                # Whisper 실패 → 자막 없이 구조화 (기존과 동일 품질)
                video_for_structure = video
        else:
            # 다운로드 실패 → 자막 없이 구조화
            cleanup_wav(video_id)
            video_for_structure = video

    # 구조화
    result = structure_single(video_for_structure)
    result["transcript_source"] = transcript_source
    return result


# --- 메인 파이프라인 ---

def run_pipeline(resume: bool = False):
    """전체 오케스트레이터"""
    # 데이터 로드
    videos = json.loads(VIDEOS_JSON.read_text(encoding="utf-8"))
    print(f"전체 영상: {len(videos)}개")

    # 진행 상황
    progress = load_progress() if resume else {
        "completed": [], "failed": [],
        "stats": {"whisper": 0, "existing_transcript": 0, "no_transcript": 0}
    }
    completed_ids = set(progress["completed"])

    # 이미 처리된 activities 로드 (resume 시) 또는 빈 리스트
    if resume and completed_ids:
        activities = load_activities()
        # completed_ids에 있는 것만 유지
        activities = [a for a in activities if a["video_id"] in completed_ids]
    else:
        activities = []

    remaining = [v for v in videos if v["video_id"] not in completed_ids]
    print(f"완료: {len(completed_ids)}개 | 남은 영상: {len(remaining)}개")

    if not remaining:
        print("모든 영상이 이미 처리되었습니다!")
        return

    # 자막 보유 현황
    has_yt_transcript = sum(1 for v in remaining if v.get("has_transcript") and v.get("transcript", "").strip())
    needs_whisper = len(remaining) - has_yt_transcript
    print(f"  YouTube 자막 있음: {has_yt_transcript}개 (Whisper 스킵)")
    print(f"  Whisper 필요: {needs_whisper}개")
    print(f"\n파이프라인 시작...")
    print(f"{'='*60}")

    start_time = time.time()

    for i, video in enumerate(remaining):
        vid = video["video_id"]
        try:
            print(f"\n[{i+1}/{len(remaining)}] {vid} — {video.get('title', '')[:50]}")

            result = process_single(video)
            activities.append(result)
            completed_ids.add(vid)

            # 통계 업데이트
            src = result.get("transcript_source", "none")
            if src == "youtube":
                progress["stats"]["existing_transcript"] += 1
            elif src == "whisper":
                progress["stats"]["whisper"] += 1
            else:
                progress["stats"]["no_transcript"] += 1

            status = "PE" if result.get("is_pe_activity") else "non-PE"
            elapsed = time.time() - start_time
            avg = elapsed / (i + 1)
            eta_min = (len(remaining) - i - 1) * avg / 60
            print(f"  → {status} | 자막: {src} | {avg:.1f}s/건 | ETA {eta_min:.0f}분")

            # 매 건 저장
            save_activities(activities)
            progress["completed"] = list(completed_ids)
            save_progress(progress)

        except Exception as e:
            print(f"  [에러] {vid}: {e}")
            progress["failed"].append({"video_id": vid, "error": str(e)[:200]})
            save_progress(progress)
            cleanup_wav(vid)

    # 완료 요약
    total_time = time.time() - start_time
    pe_count = sum(1 for a in activities if a.get("is_pe_activity"))
    stats = progress["stats"]
    print(f"\n{'='*60}")
    print(f"파이프라인 완료!")
    print(f"  총 처리: {len(activities)}개 (체육: {pe_count}, 비체육: {len(activities) - pe_count})")
    print(f"  자막: Whisper {stats['whisper']}개 | YouTube {stats['existing_transcript']}개 | 없음 {stats['no_transcript']}개")
    print(f"  실패: {len(progress['failed'])}개")
    print(f"  소요 시간: {total_time/3600:.1f}시간 ({total_time/60:.0f}분)")


def dry_run():
    """통계만 출력 (실제 처리 안 함)"""
    videos = json.loads(VIDEOS_JSON.read_text(encoding="utf-8"))
    progress = load_progress()
    completed_ids = set(progress.get("completed", []))

    total = len(videos)
    done = len(completed_ids)
    remaining = [v for v in videos if v["video_id"] not in completed_ids]

    has_yt = sum(1 for v in remaining if v.get("has_transcript") and v.get("transcript", "").strip())
    needs_whisper = len(remaining) - has_yt

    print(f"=== Dry Run ===")
    print(f"전체 영상: {total}개")
    print(f"이미 완료: {done}개")
    print(f"처리 대상: {len(remaining)}개")
    print(f"  - YouTube 자막 있음 (Whisper 스킵): {has_yt}개")
    print(f"  - Whisper 추출 필요: {needs_whisper}개")
    print(f"\n예상 소요:")
    print(f"  - 영상당 ~30-55초 (다운로드 + Whisper + 구조화)")
    print(f"  - 총 {needs_whisper * 40 / 3600:.1f} ~ {needs_whisper * 55 / 3600:.1f}시간")

    if progress.get("failed"):
        print(f"\n이전 실행 실패 목록: {len(progress['failed'])}개")
        for f in progress["failed"][:5]:
            print(f"  - {f['video_id']}: {f['error'][:80]}")


if __name__ == "__main__":
    if "--dry-run" in sys.argv:
        dry_run()
    elif "--resume" in sys.argv:
        run_pipeline(resume=True)
    else:
        run_pipeline(resume=False)
