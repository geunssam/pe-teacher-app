"""
Whisper 전사 + 구조화 2단계 파이프라인
- Phase 1 (--transcribe): 전체 영상 Whisper 전사 → transcripts.json 저장
- Phase 2 (--structure): transcripts.json 기반 구조화 → activities.json 저장
- 각 단계 독립 실행, --resume 지원
"""
import json
import subprocess
import sys
import time
from pathlib import Path

from config import VIDEOS_JSON, ACTIVITIES_JSON, STRUCTURED_DIR

# Whisper 설정
WHISPER_CLI = "/opt/homebrew/bin/whisper-cli"
WHISPER_MODEL = str(Path.home() / ".whisper-cpp/models/ggml-large-v3-turbo.bin")
TEMP_DIR = Path(__file__).parent / "data" / "whisper_temp"

# 진행 상황 파일
WHISPER_PROGRESS = STRUCTURED_DIR / "whisper_progress.json"
TRANSCRIPTS_JSON = STRUCTURED_DIR / "transcripts.json"

# 재시도 설정
MAX_RETRIES = 3


# ============================================================
# 공통 유틸
# ============================================================

def load_progress() -> dict:
    if WHISPER_PROGRESS.exists():
        return json.loads(WHISPER_PROGRESS.read_text(encoding="utf-8"))
    return {"completed": [], "failed": [], "stats": {"whisper": 0, "existing_transcript": 0, "no_transcript": 0}}


def save_progress(progress: dict):
    WHISPER_PROGRESS.write_text(
        json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def load_transcripts() -> dict:
    """video_id → {transcript, source} 매핑"""
    if TRANSCRIPTS_JSON.exists():
        return json.loads(TRANSCRIPTS_JSON.read_text(encoding="utf-8"))
    return {}


def save_transcripts(transcripts: dict):
    TRANSCRIPTS_JSON.write_text(
        json.dumps(transcripts, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def load_activities() -> list[dict]:
    if ACTIVITIES_JSON.exists():
        return json.loads(ACTIVITIES_JSON.read_text(encoding="utf-8"))
    return []


def save_activities(activities: list[dict]):
    ACTIVITIES_JSON.write_text(
        json.dumps(activities, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ============================================================
# Phase 1: Whisper 전사
# ============================================================

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


def run_transcribe(resume: bool = False):
    """Phase 1: 전체 영상 Whisper 전사"""
    videos = json.loads(VIDEOS_JSON.read_text(encoding="utf-8"))
    print(f"전체 영상: {len(videos)}개")

    # 진행 상황 + 전사 결과 로드
    progress = load_progress() if resume else {
        "completed": [], "failed": [],
        "stats": {"whisper": 0, "existing_transcript": 0, "no_transcript": 0}
    }
    transcripts = load_transcripts() if resume else {}
    completed_ids = set(progress["completed"])

    # 기존 통합 파이프라인에서 마이그레이션: activities.json에서 전사 결과 복구
    if resume and completed_ids and not transcripts:
        print("기존 파이프라인 결과에서 전사 데이터 마이그레이션...")
        activities = load_activities()
        for act in activities:
            vid = act.get("video_id")
            if vid and vid in completed_ids:
                src = act.get("transcript_source", "none")
                transcripts[vid] = {"transcript": "", "source": src}
        save_transcripts(transcripts)
        print(f"  → {len(transcripts)}건 마이그레이션 완료")

    remaining = [v for v in videos if v["video_id"] not in completed_ids]
    has_yt = sum(1 for v in remaining if v.get("has_transcript") and v.get("transcript", "").strip())
    needs_whisper = len(remaining) - has_yt

    print(f"완료: {len(completed_ids)}개 | 남은 영상: {len(remaining)}개")
    print(f"  YouTube 자막 있음: {has_yt}개 (Whisper 스킵)")
    print(f"  Whisper 필요: {needs_whisper}개")
    print(f"\n{'='*60}")
    print(f"Phase 1: Whisper 전사 시작")
    print(f"{'='*60}")

    start_time = time.time()

    for i, video in enumerate(remaining):
        vid = video["video_id"]
        try:
            print(f"\n[{i+1}/{len(remaining)}] {vid} — {video.get('title', '')[:60]}")

            # 기존 YouTube 자막 있으면 그대로 사용
            if video.get("has_transcript") and video.get("transcript", "").strip():
                transcripts[vid] = {
                    "transcript": video["transcript"],
                    "source": "youtube",
                }
                progress["stats"]["existing_transcript"] += 1
                source_label = "youtube"
            else:
                # Whisper 전사
                wav_path = download_audio(vid)
                if wav_path:
                    transcript = extract_transcript(wav_path)
                    cleanup_wav(vid)

                    if transcript:
                        transcripts[vid] = {
                            "transcript": transcript,
                            "source": "whisper",
                        }
                        progress["stats"]["whisper"] += 1
                        source_label = "whisper"
                    else:
                        transcripts[vid] = {"transcript": "", "source": "none"}
                        progress["stats"]["no_transcript"] += 1
                        source_label = "none"
                else:
                    cleanup_wav(vid)
                    transcripts[vid] = {"transcript": "", "source": "none"}
                    progress["stats"]["no_transcript"] += 1
                    source_label = "none"

            completed_ids.add(vid)

            elapsed = time.time() - start_time
            avg = elapsed / (i + 1)
            eta_min = (len(remaining) - i - 1) * avg / 60
            print(f"  → 자막: {source_label} | {avg:.1f}s/건 | ETA {eta_min:.0f}분")

            # 매 건 저장
            save_transcripts(transcripts)
            progress["completed"] = list(completed_ids)
            save_progress(progress)

        except Exception as e:
            print(f"  [에러] {vid}: {e}")
            progress["failed"].append({"video_id": vid, "error": str(e)[:200]})
            save_progress(progress)
            cleanup_wav(vid)

    # 완료 요약
    total_time = time.time() - start_time
    stats = progress["stats"]
    print(f"\n{'='*60}")
    print(f"Phase 1 완료! 전사: {len(transcripts)}건")
    print(f"  Whisper {stats['whisper']}개 | YouTube {stats['existing_transcript']}개 | 없음 {stats['no_transcript']}개")
    print(f"  실패: {len(progress['failed'])}개")
    print(f"  소요 시간: {total_time/3600:.1f}시간 ({total_time/60:.0f}분)")
    print(f"\n다음 단계: python whisper_pipeline.py --structure")


# ============================================================
# Phase 2: 구조화 (Ollama 사용)
# ============================================================

def run_structure(resume: bool = False):
    """Phase 2: transcripts.json 기반 구조화"""
    from structure import structure_single

    videos = json.loads(VIDEOS_JSON.read_text(encoding="utf-8"))
    transcripts = load_transcripts()

    if not transcripts:
        print("transcripts.json이 없습니다. --transcribe를 먼저 실행하세요.")
        return

    print(f"전체 영상: {len(videos)}개 | 전사 완료: {len(transcripts)}개")

    # 구조화 진행 상황 (별도 추적)
    structure_progress_path = STRUCTURED_DIR / "structure_progress.json"
    if resume and structure_progress_path.exists():
        structure_progress = json.loads(structure_progress_path.read_text(encoding="utf-8"))
    else:
        structure_progress = {"completed": []}

    structured_ids = set(structure_progress["completed"])
    activities = load_activities() if resume else []
    if resume:
        activities = [a for a in activities if a["video_id"] in structured_ids]

    # 전사 완료된 영상 중 아직 구조화 안 된 것만 처리
    remaining = [v for v in videos if v["video_id"] in transcripts and v["video_id"] not in structured_ids]
    print(f"구조화 완료: {len(structured_ids)}개 | 남은 영상: {len(remaining)}개")

    if not remaining:
        print("모든 영상이 이미 구조화되었습니다!")
        return

    print(f"\n{'='*60}")
    print(f"Phase 2: 구조화 시작 (Ollama)")
    print(f"{'='*60}")

    start_time = time.time()

    for i, video in enumerate(remaining):
        vid = video["video_id"]
        try:
            # 전사 결과를 video에 병합
            t_data = transcripts.get(vid, {})
            video_with_transcript = {
                **video,
                "transcript": t_data.get("transcript", ""),
                "has_transcript": bool(t_data.get("transcript")),
            }

            result = structure_single(video_with_transcript)
            result["transcript_source"] = t_data.get("source", "none")

            activities.append(result)
            structured_ids.add(vid)

            status = "PE" if result.get("is_pe_activity") else "non-PE"
            elapsed = time.time() - start_time
            avg = elapsed / (i + 1)
            eta_min = (len(remaining) - i - 1) * avg / 60
            print(f"  [{i+1}/{len(remaining)}] {vid} → {status} | {avg:.1f}s/건 | ETA {eta_min:.0f}분")

            # 매 건 저장
            save_activities(activities)
            structure_progress["completed"] = list(structured_ids)
            structure_progress_path.write_text(
                json.dumps(structure_progress, ensure_ascii=False, indent=2), encoding="utf-8"
            )

        except Exception as e:
            print(f"  [에러] {vid}: {e}")

    # 완료 요약
    total_time = time.time() - start_time
    pe_count = sum(1 for a in activities if a.get("is_pe_activity"))
    print(f"\n{'='*60}")
    print(f"Phase 2 완료!")
    print(f"  총 처리: {len(activities)}개 (체육: {pe_count}, 비체육: {len(activities) - pe_count})")
    print(f"  소요 시간: {total_time/3600:.1f}시간 ({total_time/60:.0f}분)")


# ============================================================
# 상태 확인
# ============================================================

def dry_run():
    """통계만 출력"""
    videos = json.loads(VIDEOS_JSON.read_text(encoding="utf-8"))
    progress = load_progress()
    transcripts = load_transcripts()
    completed_ids = set(progress.get("completed", []))

    structure_progress_path = STRUCTURED_DIR / "structure_progress.json"
    structured_ids = set()
    if structure_progress_path.exists():
        sp = json.loads(structure_progress_path.read_text(encoding="utf-8"))
        structured_ids = set(sp.get("completed", []))

    remaining_transcribe = [v for v in videos if v["video_id"] not in completed_ids]
    remaining_structure = [v for v in videos if v["video_id"] in transcripts and v["video_id"] not in structured_ids]

    has_yt = sum(1 for v in remaining_transcribe if v.get("has_transcript") and v.get("transcript", "").strip())
    needs_whisper = len(remaining_transcribe) - has_yt

    print(f"=== 파이프라인 현황 ===")
    print(f"전체 영상: {len(videos)}개")
    print(f"")
    print(f"[Phase 1: 전사]")
    print(f"  완료: {len(completed_ids)}개")
    print(f"  남은: {len(remaining_transcribe)}개 (YouTube {has_yt} + Whisper {needs_whisper})")
    print(f"  예상: ~{needs_whisper * 300 / 3600:.1f}시간 (Whisper ~300초/건)")
    print(f"")
    print(f"[Phase 2: 구조화]")
    print(f"  전사 완료 (구조화 대기): {len(transcripts)}개")
    print(f"  구조화 완료: {len(structured_ids)}개")
    print(f"  남은: {len(remaining_structure)}개")
    print(f"  예상: ~{len(remaining_structure) * 30 / 3600:.1f}시간 (Ollama ~30초/건)")

    if progress.get("failed"):
        print(f"\n전사 실패: {len(progress['failed'])}개")
        for f in progress["failed"][:5]:
            print(f"  - {f['video_id']}: {f['error'][:80]}")


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    args = sys.argv[1:]
    resume = "--resume" in args

    if "--dry-run" in args:
        dry_run()
    elif "--transcribe" in args:
        run_transcribe(resume=resume)
    elif "--structure" in args:
        run_structure(resume=resume)
    else:
        print("사용법:")
        print("  python whisper_pipeline.py --transcribe [--resume]  # Phase 1: Whisper 전사")
        print("  python whisper_pipeline.py --structure [--resume]   # Phase 2: 구조화")
        print("  python whisper_pipeline.py --dry-run                # 현황 확인")
