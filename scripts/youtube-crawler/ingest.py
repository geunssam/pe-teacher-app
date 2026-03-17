"""
Phase 3 헬퍼: activities.json → PEHub 서버로 인제스트
PEHub 서버가 localhost:3400에서 실행 중이어야 합니다.
"""
import json
import sys
import requests
from config import ACTIVITIES_JSON, STRUCTURED_DIR


INGEST_URL = "http://localhost:3400/ingestYouTubeFlow"
BATCH_SIZE = 20  # 서버에 한 번에 보내는 영상 수
INGEST_PROGRESS = STRUCTURED_DIR / "ingest_progress.json"


def load_ingest_progress() -> set:
    """임베딩 완료된 video_id 로드"""
    if INGEST_PROGRESS.exists():
        data = json.loads(INGEST_PROGRESS.read_text(encoding="utf-8"))
        return set(data.get("completed", []))
    return set()


def save_ingest_progress(completed: set):
    """임베딩 완료된 video_id 저장"""
    INGEST_PROGRESS.write_text(
        json.dumps({"completed": sorted(completed)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def ingest_all():
    """activities.json → PEHub 서버 인제스트"""
    if not ACTIVITIES_JSON.exists():
        print("activities.json이 없습니다. structure.py를 먼저 실행하세요.")
        return

    activities = json.loads(ACTIVITIES_JSON.read_text(encoding="utf-8"))
    pe_activities = [a for a in activities if a.get("is_pe_activity")]

    # 이미 완료된 건 건너뛰기
    completed = load_ingest_progress()
    remaining = [a for a in pe_activities if a.get("video_id") not in completed]
    print(f"총 {len(activities)}개 중 체육 활동 {len(pe_activities)}개")
    print(f"이미 임베딩 완료: {len(completed)}개, 남은 활동: {len(remaining)}개")

    if not remaining:
        print("모든 체육 활동이 이미 임베딩되었습니다!")
        return

    total_embedded = 0
    for i in range(0, len(remaining), BATCH_SIZE):
        batch = remaining[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        try:
            resp = requests.post(
                INGEST_URL,
                json={"data": {"videos": batch}},
                timeout=120,
            )
            resp.raise_for_status()
            result = resp.json().get("result", {})
            embedded = result.get("embedded", 0)
            total_embedded += embedded

            # 완료된 video_id 추적
            for a in batch:
                completed.add(a.get("video_id"))
            save_ingest_progress(completed)

            print(f"  배치 {batch_num}: {embedded}개 임베딩 완료")
        except Exception as e:
            print(f"  배치 {batch_num} 에러: {e}")

    print(f"\n=== 인제스트 완료 ===")
    print(f"총 임베딩: {total_embedded}개")


if __name__ == "__main__":
    ingest_all()
