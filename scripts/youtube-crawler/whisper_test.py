"""
Whisper 자막 추출 → 재구조화 품질 테스트
E10(진행 순서 부족) 3건에 대해 Whisper 자막 추출 후 재구조화하여
기존 결과와 비교한다.
"""
import json
import subprocess
import tempfile
import os
from pathlib import Path

from config import VIDEOS_JSON, ACTIVITIES_JSON
from structure import structure_single

# 테스트 대상 영상
TEST_VIDEOS = [
    "E88eFcOoFfs",  # 먼저 하교 놀이
    "XdLAFIyD6Wg",  # 맥도널드!
    "q9y_AGlfkbc",  # 몸 코코코!
]

WHISPER_CLI = "/opt/homebrew/bin/whisper-cli"
WHISPER_MODEL = str(Path.home() / ".whisper-cpp/models/ggml-large-v3-turbo.bin")
TEMP_DIR = Path(__file__).parent / "data" / "whisper_temp"


def download_audio(video_id: str) -> Path:
    """yt-dlp로 오디오 다운로드 (16kHz WAV — Whisper 요구사항)"""
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    output_path = TEMP_DIR / f"{video_id}.wav"

    if output_path.exists():
        print(f"  [캐시] {output_path.name} 이미 존재, 스킵")
        return output_path

    url = f"https://www.youtube.com/watch?v={video_id}"
    cmd = [
        "yt-dlp",
        "-x", "--audio-format", "wav",
        "--postprocessor-args", "ffmpeg:-ar 16000 -ac 1",
        "-o", str(output_path),
        url,
    ]
    print(f"  [다운로드] {video_id}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  [에러] yt-dlp 실패: {result.stderr[:200]}")
        return None
    return output_path


def extract_transcript(wav_path: Path) -> str:
    """whisper-cli로 한국어 자막 추출"""
    cmd = [
        WHISPER_CLI,
        "-m", WHISPER_MODEL,
        "-l", "ko",
        "--no-timestamps",
        "-f", str(wav_path),
    ]
    print(f"  [Whisper] {wav_path.name} 처리 중...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  [에러] whisper 실패: {result.stderr[:200]}")
        return ""

    # whisper-cli는 stdout으로 자막 출력
    transcript = result.stdout.strip()
    # 빈 줄, 앞뒤 공백 정리
    lines = [line.strip() for line in transcript.splitlines() if line.strip()]
    return " ".join(lines)


def load_existing_result(video_id: str) -> dict | None:
    """기존 구조화 결과 로드"""
    activities = json.loads(ACTIVITIES_JSON.read_text(encoding="utf-8"))
    for item in activities:
        if item.get("video_id") == video_id:
            return item
    return None


def load_raw_video(video_id: str) -> dict | None:
    """원본 영상 메타데이터 로드"""
    videos = json.loads(VIDEOS_JSON.read_text(encoding="utf-8"))
    for v in videos:
        if v.get("video_id") == video_id:
            return v
    return None


def run_test():
    """3건 테스트 실행"""
    results = []

    for vid in TEST_VIDEOS:
        print(f"\n{'='*60}")
        print(f"영상: {vid}")
        print(f"{'='*60}")

        # 1. 기존 결과
        before = load_existing_result(vid)
        if not before:
            print(f"  [스킵] 기존 구조화 결과 없음")
            continue

        print(f"  제목: {before['title']}")

        # 2. 오디오 다운로드
        wav_path = download_audio(vid)
        if not wav_path or not wav_path.exists():
            print(f"  [스킵] 오디오 다운로드 실패")
            continue

        # 3. Whisper 자막 추출
        transcript = extract_transcript(wav_path)
        if not transcript:
            print(f"  [스킵] 자막 추출 실패")
            continue

        print(f"  [자막] {len(transcript)}자 추출됨")
        print(f"  [자막 미리보기] {transcript[:200]}...")

        # 4. 자막 주입하여 재구조화
        raw_video = load_raw_video(vid)
        if not raw_video:
            print(f"  [스킵] 원본 메타데이터 없음")
            continue

        # 자막을 주입한 새 데이터
        video_with_transcript = {**raw_video, "transcript": transcript, "has_transcript": True}
        print(f"  [구조화] Ollama로 재구조화 중...")
        after = structure_single(video_with_transcript)

        results.append({
            "video_id": vid,
            "title": before["title"],
            "transcript": transcript,
            "before": before,
            "after": after,
        })

    # 결과 저장
    output_path = TEMP_DIR / "whisper_test_results.json"
    output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n결과 저장: {output_path}")

    # 비교 출력
    print_comparison(results)


def print_comparison(results: list[dict]):
    """Before/After 비교 출력"""
    print(f"\n{'='*80}")
    print("📊 Whisper 자막 추출 → 재구조화 품질 비교")
    print(f"{'='*80}")

    for r in results:
        title = r["title"]
        vid = r["video_id"]
        b_act = r["before"].get("activity", {})
        a_act = r["after"].get("activity", {})

        print(f"\n{'─'*80}")
        print(f"🎬 {title} ({vid})")
        print(f"📝 Whisper 자막: {len(r['transcript'])}자")
        print(f"{'─'*80}")

        # steps 비교
        b_steps = b_act.get("steps", [])
        a_steps = a_act.get("steps", [])
        print(f"\n[steps] Before ({len(b_steps)}단계) → After ({len(a_steps)}단계)")
        print(f"  Before: {b_steps}")
        print(f"  After:  {a_steps}")

        # summary 비교
        print(f"\n[summary]")
        print(f"  Before: {b_act.get('summary', '')[:100]}")
        print(f"  After:  {a_act.get('summary', '')[:100]}")

        # equipment 비교
        print(f"\n[equipment]")
        print(f"  Before: {b_act.get('equipment', [])}")
        print(f"  After:  {a_act.get('equipment', [])}")

        # court_setup 비교
        print(f"\n[court_setup]")
        print(f"  Before: {b_act.get('court_setup', '')}")
        print(f"  After:  {a_act.get('court_setup', '')}")


if __name__ == "__main__":
    run_test()
