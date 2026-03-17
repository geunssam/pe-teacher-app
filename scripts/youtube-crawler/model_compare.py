"""
qwen3.5:35b vs qwen3:14b 품질+속도 비교 테스트
Whisper 자막이 있는 영상 3개로 동일 조건 비교
"""
import json
import time
import ollama
from config import VIDEOS_JSON, ACTIVITIES_JSON
from structure import EXTRACTION_PROMPT, OLLAMA_JSON_SCHEMA

MODELS = ["qwen3.5:35b", "qwen3:14b"]

# Whisper로 이미 처리된 영상 중 3개 선택 (activities.json에서 whisper 자막 포함된 것)
TEST_IDS = [
    "E88eFcOoFfs",  # 먼저 하교 놀이 (whisper_test에서 검증된 것)
    "XdLAFIyD6Wg",  # 맥도널드!
    "q9y_AGlfkbc",  # 몸 코코코!
]


def load_video(video_id: str) -> dict:
    videos = json.loads(VIDEOS_JSON.read_text(encoding="utf-8"))
    for v in videos:
        if v["video_id"] == video_id:
            return v
    return None


def load_whisper_transcript(video_id: str) -> str:
    """whisper_test_results.json에서 자막 로드"""
    results_path = VIDEOS_JSON.parent.parent / "whisper_temp" / "whisper_test_results.json"
    if results_path.exists():
        results = json.loads(results_path.read_text(encoding="utf-8"))
        for r in results:
            if r["video_id"] == video_id:
                return r.get("transcript", "")
    return ""


def call_model(model: str, video: dict) -> tuple[dict, float]:
    """모델 호출 → (결과, 소요시간)"""
    title = video.get("title", "")
    description = video.get("description", "")[:2000]
    transcript = video.get("transcript", "")[:4000]
    if not transcript:
        transcript = "(자막 없음 - 제목과 설명만으로 추출)"

    prompt = EXTRACTION_PROMPT.format(
        title=title, description=description, transcript=transcript
    )

    start = time.time()
    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        format=OLLAMA_JSON_SCHEMA,
        options={"temperature": 0, "num_ctx": 8192},
    )
    elapsed = time.time() - start
    parsed = json.loads(response.message.content.strip())
    return parsed, elapsed


def compare():
    print("=" * 70)
    print("qwen3.5:35b vs qwen3:14b 비교 테스트")
    print("=" * 70)

    for vid in TEST_IDS:
        video = load_video(vid)
        if not video:
            print(f"\n[스킵] {vid} — videos.json에 없음")
            continue

        # Whisper 자막 주입
        transcript = load_whisper_transcript(vid)
        if transcript:
            video = {**video, "transcript": transcript, "has_transcript": True}
            print(f"\n{'─'*70}")
            print(f"영상: {video['title']} ({vid})")
            print(f"자막: {len(transcript)}자")
            print(f"{'─'*70}")
        else:
            print(f"\n{'─'*70}")
            print(f"영상: {video['title']} ({vid})")
            print(f"자막: 없음 (제목+설명만 사용)")
            print(f"{'─'*70}")

        results = {}
        for model in MODELS:
            print(f"\n  [{model}] 처리 중...")
            parsed, elapsed = call_model(model, video)
            results[model] = {"parsed": parsed, "time": elapsed}
            print(f"  [{model}] {elapsed:.1f}초")

        # 비교 출력
        print(f"\n  {'항목':<15} | {'35b':<40} | {'14b':<40}")
        print(f"  {'─'*15}-+-{'─'*40}-+-{'─'*40}")

        for model in MODELS:
            act = results[model]["parsed"].get("activity", {})
            tag = "35b" if "35b" in model else "14b"
            if model == MODELS[0]:
                act_35b = act
            else:
                act_14b = act

        # 속도
        t35 = results[MODELS[0]]["time"]
        t14 = results[MODELS[1]]["time"]
        print(f"  {'속도':<15} | {t35:.1f}초{'':<34} | {t14:.1f}초 ({t35/t14:.1f}x 빠름)")

        # steps
        s35 = act_35b.get("steps", [])
        s14 = act_14b.get("steps", [])
        print(f"  {'steps 수':<13} | {len(s35)}단계{'':<35} | {len(s14)}단계")

        # steps 내용 비교
        print(f"\n  [35b steps]")
        for j, s in enumerate(s35, 1):
            print(f"    {j}. {s[:70]}")
        print(f"  [14b steps]")
        for j, s in enumerate(s14, 1):
            print(f"    {j}. {s[:70]}")

        # summary
        print(f"\n  [35b summary] {act_35b.get('summary', '')[:120]}")
        print(f"  [14b summary] {act_14b.get('summary', '')[:120]}")

        # equipment
        print(f"\n  [35b equipment] {act_35b.get('equipment', [])}")
        print(f"  [14b equipment] {act_14b.get('equipment', [])}")

        # court_setup
        print(f"\n  [35b court] {act_35b.get('court_setup', '')[:80]}")
        print(f"  [14b court] {act_14b.get('court_setup', '')[:80]}")

    # 속도 요약
    print(f"\n{'='*70}")
    print("속도 요약: 35b 기준 14b가 몇 배 빠른지")
    print(f"  14b 사용 시 예상 총 소요: 현재 ETA의 1/{t35/t14:.1f}")


if __name__ == "__main__":
    compare()
