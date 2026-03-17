"""
Phase 2: 체육 활동 정보 구조화 추출
- videos.json에서 자막/설명 로드
- Ollama (Qwen3-30B-A3B) 또는 Gemini 2.5 Flash로 활동 정보 구조화
"""
import json
import os
import time
import sys

from config import (
    VIDEOS_JSON, ACTIVITIES_JSON, STRUCTURED_DIR,
    GEMINI_MODEL, GEMINI_BATCH_SIZE, GEMINI_BATCH_DELAY,
    ENV_FILE,
)

# --- 백엔드 선택 ---
USE_OLLAMA = True  # False로 바꾸면 Gemini 사용
OLLAMA_MODEL = "qwen3.5:35b"

# Ollama JSON 스키마 (구조화 출력 강제)
OLLAMA_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "is_pe_activity": {"type": "boolean"},
        "activity": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "summary": {"type": "string"},
                "steps": {"type": "array", "items": {"type": "string"}},
                "cautions": {"type": "array", "items": {"type": "string"}},
                "equipment": {"type": "array", "items": {"type": "string"}},
                "suitable_grades": {"type": "array", "items": {"type": "string"}},
                "space": {"type": "array", "items": {"type": "string"}},
                "domain": {"type": "string"},
                "court_setup": {"type": "string"},
            },
            "required": ["name", "summary", "steps", "cautions", "equipment", "suitable_grades", "space", "domain", "court_setup"],
        },
    },
    "required": ["is_pe_activity", "activity"],
}

# Gemini 초기화 (필요할 때만)
_gemini_client = None

def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        # .env 파일에서 API 키 로드
        if ENV_FILE.exists():
            for line in ENV_FILE.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    os.environ.setdefault(key.strip(), val.strip())
        _gemini_client = genai.Client(api_key=os.environ.get("GOOGLE_GENAI_API_KEY"))
    return _gemini_client


EXTRACTION_PROMPT = """다음은 양수쌤체육수업 YouTube 영상의 정보입니다. 이 영상에서 체육 활동 정보를 구조화하여 JSON으로 추출해주세요.

**영상 제목**: {title}
**영상 설명**: {description}
**자막**: {transcript}

## 추출 규칙
1. 체육 활동이 아닌 영상(채널 소개, 브이로그 등)이면 is_pe_activity를 false로 설정하고 activity는 빈 값으로 채우기
2. 활동명은 영상에서 소개하는 메인 활동의 이름
3. summary는 활동 내용을 3-5문장으로 요약
4. steps는 활동 진행 순서를 배열로 정리
5. cautions는 안전 주의사항
6. equipment는 필요한 준비물
7. suitable_grades는 적합한 학년 (예: "3-4학년", "전학년")
8. space는 활동 장소 (체육관, 운동장, 교실 중 선택)
9. domain은 체육 영역 (스포츠, 건강, 표현, 여가 중 선택)
10. court_setup은 경기장 구성 (예: "원형 경기장", "반코트", "직사각형 구역" 등 형태와 크기를 설명). 영상에서 경기장 형태를 파악할 수 없으면 "영상을 보고 경기장 구성을 확인하세요."로 작성

JSON만 출력하세요. 다른 텍스트는 포함하지 마세요."""


def load_progress() -> dict:
    """구조화 진행 상황 로드"""
    progress_path = STRUCTURED_DIR / "progress.json"
    if progress_path.exists():
        return json.loads(progress_path.read_text(encoding="utf-8"))
    return {"completed": []}


def save_progress(progress: dict):
    """구조화 진행 상황 저장"""
    progress_path = STRUCTURED_DIR / "progress.json"
    progress_path.write_text(json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8")


def load_activities() -> list[dict]:
    """기존 구조화 결과 로드"""
    if ACTIVITIES_JSON.exists():
        return json.loads(ACTIVITIES_JSON.read_text(encoding="utf-8"))
    return []


def save_activities(activities: list[dict]):
    """구조화 결과 저장"""
    ACTIVITIES_JSON.write_text(json.dumps(activities, ensure_ascii=False, indent=2), encoding="utf-8")


def structure_single(video: dict) -> dict:
    """단일 영상 구조화"""
    title = video.get("title", "")
    description = video.get("description", "")
    transcript = video.get("transcript", "")

    # 자막 없으면 설명만 사용
    if not transcript:
        transcript = "(자막 없음 - 제목과 설명만으로 추출)"

    prompt = EXTRACTION_PROMPT.format(
        title=title,
        description=description[:2000],
        transcript=transcript[:4000],
    )

    if USE_OLLAMA:
        parsed = _call_ollama(prompt)
    else:
        parsed = _call_gemini(prompt)

    return {
        "video_id": video["video_id"],
        "title": title,
        "url": video.get("url", f"https://www.youtube.com/watch?v={video['video_id']}"),
        "is_short": video.get("is_short", False),
        "has_transcript": video.get("has_transcript", False),
        **parsed,
    }


def _call_ollama(prompt: str) -> dict:
    """Ollama로 구조화 추출 (JSON 스키마 강제)"""
    import ollama
    response = ollama.chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
        format=OLLAMA_JSON_SCHEMA,
        options={"temperature": 0, "num_ctx": 8192},
    )
    text = response.message.content.strip()
    return json.loads(text)


def _call_gemini(prompt: str) -> dict:
    """Gemini로 구조화 추출"""
    client = _get_gemini_client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    return json.loads(text)


def structure_all():
    """전체 영상 구조화"""
    if not VIDEOS_JSON.exists():
        print("videos.json이 없습니다. crawl.py를 먼저 실행하세요.")
        return

    videos = json.loads(VIDEOS_JSON.read_text(encoding="utf-8"))
    backend = f"Ollama ({OLLAMA_MODEL})" if USE_OLLAMA else f"Gemini ({GEMINI_MODEL})"
    print(f"총 {len(videos)}개 영상 로드 | 백엔드: {backend}")

    # 진행 상황
    progress = load_progress()
    completed_ids = set(progress.get("completed", []))
    activities = load_activities()

    remaining = [v for v in videos if v["video_id"] not in completed_ids]
    print(f"이미 완료: {len(completed_ids)}개, 남은 영상: {len(remaining)}개")

    if not remaining:
        print("모든 영상이 이미 구조화되었습니다!")
        return

    save_interval = 1  # 매 건마다 즉시 저장 (뷰어 실시간 반영)
    batch_count = 0
    start_time = time.time()

    for i, video in enumerate(remaining):
        vid = video["video_id"]
        try:
            result = structure_single(video)
            activities.append(result)
            completed_ids.add(vid)

            status = "PE" if result.get("is_pe_activity") else "non-PE"
            elapsed = time.time() - start_time
            avg_per_item = elapsed / (i + 1)
            eta_min = (len(remaining) - i - 1) * avg_per_item / 60
            print(f"  [{i+1}/{len(remaining)}] {vid} → {status}: {result.get('title', '')[:40]} ({avg_per_item:.1f}s/건, ETA {eta_min:.0f}분)")

            batch_count += 1

            # 주기적 저장
            if batch_count % save_interval == 0:
                save_activities(activities)
                progress["completed"] = list(completed_ids)
                save_progress(progress)
                print(f"  [저장] {batch_count}개 처리 완료")

                # Gemini 모드일 때만 딜레이
                if not USE_OLLAMA:
                    print(f"  {GEMINI_BATCH_DELAY}초 대기...")
                    time.sleep(GEMINI_BATCH_DELAY)

        except json.JSONDecodeError as e:
            print(f"  [JSON 에러] {vid}: {e}")
        except Exception as e:
            print(f"  [에러] {vid}: {e}")
            if not USE_OLLAMA and ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)):
                print("  → Rate limit! 60초 대기...")
                time.sleep(60)

    # 최종 저장
    save_activities(activities)
    progress["completed"] = list(completed_ids)
    save_progress(progress)

    total_time = time.time() - start_time
    pe_count = sum(1 for a in activities if a.get("is_pe_activity"))
    print(f"\n=== 구조화 완료 ===")
    print(f"총 처리: {len(activities)}개")
    print(f"체육 활동: {pe_count}개")
    print(f"비체육: {len(activities) - pe_count}개")
    print(f"소요 시간: {total_time/60:.1f}분")


def structure_test(video_data: dict):
    """단일 영상 구조화 테스트"""
    print(f"구조화 테스트: {video_data.get('title', video_data.get('video_id', ''))}")
    result = structure_single(video_data)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        if len(sys.argv) > 2:
            video_data = json.loads(sys.argv[2])
        else:
            video_data = {
                "video_id": "ocHqauUSBbw",
                "title": "[양수쌤 놀이체육] 천사의 못 구출 작전!",
                "description": "협력 배려 술래 게임 한 가지를 생각해 봤습니다. 망치 모양의 펀스틱과 고리를 만들어 활용하는 아이디어입니다.",
                "transcript": "",
                "has_transcript": False,
                "is_short": True,
                "url": "https://www.youtube.com/watch?v=ocHqauUSBbw",
            }
        structure_test(video_data)
    else:
        structure_all()
