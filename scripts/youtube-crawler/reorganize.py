"""
데이터 구조 정리: 거대 JSON → 영상별 폴더 구조
videos/{video_id}/meta.json + transcript.txt + activity.json
"""
import json
import os
import shutil
from pathlib import Path
from collections import Counter

BASE_DIR = Path(__file__).parent / "data"
RAW_DIR = BASE_DIR / "raw"
STRUCTURED_DIR = BASE_DIR / "structured"
VIDEOS_DIR = BASE_DIR / "videos"
ARCHIVE_DIR = BASE_DIR / "archive"


def load_json(path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path, data, indent=2):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=indent), encoding="utf-8")


def reorganize():
    # 소스 데이터 로드
    videos_raw = load_json(RAW_DIR / "videos.json") or []
    activities = load_json(STRUCTURED_DIR / "activities.json") or []
    transcripts = load_json(STRUCTURED_DIR / "transcripts.json") or {}

    print(f"소스 데이터: videos={len(videos_raw)}, activities={len(activities)}, transcripts={len(transcripts)}")

    # video_id 기준 인덱스 생성
    raw_by_id = {v["video_id"]: v for v in videos_raw}
    act_by_id = {a["video_id"]: a for a in activities}

    # 전체 video_id 합집합
    all_ids = set(raw_by_id.keys()) | set(act_by_id.keys())
    print(f"전체 영상 ID: {len(all_ids)}개")

    # 폴더 생성
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

    created = 0
    for vid in sorted(all_ids):
        vid_dir = VIDEOS_DIR / vid
        vid_dir.mkdir(exist_ok=True)

        raw = raw_by_id.get(vid, {})
        act = act_by_id.get(vid, {})
        trans = transcripts.get(vid, {})

        # meta.json: 영상 메타데이터
        meta = {
            "video_id": vid,
            "title": raw.get("title") or act.get("title", ""),
            "url": raw.get("url") or act.get("url", f"https://www.youtube.com/watch?v={vid}"),
            "is_short": raw.get("is_short") or act.get("is_short", False),
            "upload_date": raw.get("upload_date", ""),
            "duration": raw.get("duration", 0),
            "view_count": raw.get("view_count", 0),
            "channel": raw.get("channel", "양수쌤체육수업"),
            "tags": raw.get("tags", []),
            "has_transcript": bool(trans.get("transcript")),
            "transcript_source": trans.get("source") or act.get("transcript_source", "none"),
        }
        save_json(vid_dir / "meta.json", meta)

        # transcript.txt: 전사 텍스트
        transcript_text = trans.get("transcript", "") or raw.get("transcript", "")
        if transcript_text:
            (vid_dir / "transcript.txt").write_text(transcript_text, encoding="utf-8")

        # activity.json: 구조화 결과
        if act:
            activity_data = {
                "is_pe_activity": act.get("is_pe_activity", False),
                "activity": act.get("activity", {}),
            }
            save_json(vid_dir / "activity.json", activity_data)

        created += 1

    print(f"영상 폴더 생성 완료: {created}개")

    # index.json 생성 (뷰어 호환 — 기존 activities.json과 동일 포맷)
    index_data = []
    for vid in sorted(all_ids):
        act = act_by_id.get(vid, {})
        raw = raw_by_id.get(vid, {})
        trans = transcripts.get(vid, {})

        entry = {
            "video_id": vid,
            "title": act.get("title") or raw.get("title", ""),
            "url": act.get("url") or raw.get("url", f"https://www.youtube.com/watch?v={vid}"),
            "is_short": act.get("is_short") or raw.get("is_short", False),
            "has_transcript": bool(trans.get("transcript")),
            "is_pe_activity": act.get("is_pe_activity", False),
            "activity": act.get("activity", {}),
        }
        index_data.append(entry)

    save_json(BASE_DIR / "index.json", index_data)
    print(f"index.json 생성: {len(index_data)}개 항목")

    # stats.json 생성
    pe_activities = [a for a in activities if a.get("is_pe_activity")]
    domain_counts = Counter(a.get("activity", {}).get("domain", "기타") for a in pe_activities)
    space_counts = Counter()
    grade_counts = Counter()
    for a in pe_activities:
        act = a.get("activity", {})
        spaces = act.get("space", [])
        if isinstance(spaces, str):
            spaces = [spaces]
        for s in spaces:
            space_counts[s] += 1
        grades = act.get("suitable_grades", [])
        if isinstance(grades, str):
            grades = [grades]
        for g in grades:
            grade_counts[g] += 1

    stats = {
        "total_videos": len(all_ids),
        "pe_activities": len(pe_activities),
        "non_pe": len(all_ids) - len(pe_activities),
        "shorts": sum(1 for v in videos_raw if v.get("is_short")),
        "with_transcript": sum(1 for t in transcripts.values() if t.get("transcript")),
        "domains": dict(domain_counts.most_common()),
        "spaces": dict(space_counts.most_common()),
        "grades": dict(grade_counts.most_common(10)),
    }
    save_json(BASE_DIR / "stats.json", stats)
    print(f"stats.json 생성")

    # 기존 파일을 archive/로 이동
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    archive_files = [
        (RAW_DIR / "videos.json", ARCHIVE_DIR / "raw_videos.json"),
        (STRUCTURED_DIR / "activities.json", ARCHIVE_DIR / "activities.json"),
        (STRUCTURED_DIR / "transcripts.json", ARCHIVE_DIR / "transcripts.json"),
        (STRUCTURED_DIR / "activities.backup.json", ARCHIVE_DIR / "activities.backup.json"),
        (STRUCTURED_DIR / "activities.before_cleanup.json", ARCHIVE_DIR / "activities.before_cleanup.json"),
        (STRUCTURED_DIR / "activities.pre_qa_backup.json", ARCHIVE_DIR / "activities.pre_qa_backup.json"),
        (STRUCTURED_DIR / "activities.pre_whisper_backup.json", ARCHIVE_DIR / "activities.pre_whisper_backup.json"),
        (STRUCTURED_DIR / "progress.json", ARCHIVE_DIR / "progress.json"),
        (STRUCTURED_DIR / "structure_progress.json", ARCHIVE_DIR / "structure_progress.json"),
        (STRUCTURED_DIR / "whisper_progress.json", ARCHIVE_DIR / "whisper_progress.json"),
        (STRUCTURED_DIR / "structure_status.json", ARCHIVE_DIR / "structure_status.json"),
        (STRUCTURED_DIR / "qa_issues.json", ARCHIVE_DIR / "qa_issues.json"),
        (STRUCTURED_DIR / "qa_manual_review.md", ARCHIVE_DIR / "qa_manual_review.md"),
        (STRUCTURED_DIR / "ingest_progress.json", ARCHIVE_DIR / "ingest_progress.json"),
        (STRUCTURED_DIR / "progress.backup.json", ARCHIVE_DIR / "progress.backup.json"),
    ]

    moved = 0
    for src, dst in archive_files:
        if src.exists():
            shutil.copy2(src, dst)
            moved += 1

    print(f"archive/로 {moved}개 파일 복사 완료")
    print(f"\n=== 정리 완료 ===")
    print(f"영상 폴더: {VIDEOS_DIR} ({created}개)")
    print(f"인덱스: {BASE_DIR / 'index.json'}")
    print(f"통계: {BASE_DIR / 'stats.json'}")
    print(f"아카이브: {ARCHIVE_DIR} ({moved}개)")


if __name__ == "__main__":
    reorganize()
