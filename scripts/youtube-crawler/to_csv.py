"""
Phase 4-A: activities.json → CSV 변환 (노션 Import용)
"""
import csv
import json
import sys
from config import ACTIVITIES_JSON, STRUCTURED_DIR


def convert_to_csv():
    """activities.json → CSV 변환"""
    if not ACTIVITIES_JSON.exists():
        print("activities.json이 없습니다. structure.py를 먼저 실행하세요.")
        return

    activities = json.loads(ACTIVITIES_JSON.read_text(encoding="utf-8"))
    pe_activities = [a for a in activities if a.get("is_pe_activity")]

    output_path = STRUCTURED_DIR / "activities.csv"

    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "활동명", "영상 제목", "영상 링크", "내용",
            "진행 순서", "주의사항", "준비물",
            "적합 학년", "장소", "영역", "쇼츠 여부",
        ])

        for item in pe_activities:
            act = item.get("activity", {})
            grades = act.get("suitable_grades", "")
            if isinstance(grades, list):
                grades = ", ".join(grades)
            space = act.get("space", "")
            if isinstance(space, list):
                space = ", ".join(space)

            writer.writerow([
                act.get("name", ""),
                item.get("title", ""),
                item.get("url", ""),
                act.get("summary", ""),
                "\n".join(act.get("steps", [])),
                "\n".join(act.get("cautions", [])),
                ", ".join(act.get("equipment", [])),
                grades,
                space,
                act.get("domain", ""),
                "O" if item.get("is_short") else "",
            ])

    print(f"CSV 저장 완료: {output_path}")
    print(f"총 {len(pe_activities)}개 체육 활동 변환")


if __name__ == "__main__":
    convert_to_csv()
