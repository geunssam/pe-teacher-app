"""
QA 자동 수정 스크립트: qa_issues.json 기반으로 activities.json 일괄 수정
구조화 완료 후, 임베딩 전에 실행
"""
import json
import shutil
from pathlib import Path
from qa import (
    normalize_grade, normalize_space, strip_underscores,
    extract_title_activity_name, VALID_GRADES, VALID_SPACES,
)

STRUCTURED_DIR = Path(__file__).parent / "data" / "structured"
ACTIVITIES_JSON = STRUCTURED_DIR / "activities.json"
QA_ISSUES_JSON = STRUCTURED_DIR / "qa_issues.json"
COURT_SETUP_DEFAULT = "경기장 세팅 등 세부적 내용은 영상을 참고해주세요."


def apply_fixes():
    """qa_issues.json 기반으로 activities.json 수정"""
    if not ACTIVITIES_JSON.exists():
        print("activities.json이 없습니다.")
        return
    if not QA_ISSUES_JSON.exists():
        print("qa_issues.json이 없습니다. qa.py를 먼저 실행하세요.")
        return

    # 백업
    backup_path = STRUCTURED_DIR / "activities.pre_qa_backup.json"
    shutil.copy2(ACTIVITIES_JSON, backup_path)
    print(f"백업 저장: {backup_path.name}")

    data = json.loads(ACTIVITIES_JSON.read_text(encoding="utf-8"))
    issues = json.loads(QA_ISSUES_JSON.read_text(encoding="utf-8"))

    # 인덱스별 이슈 그룹핑
    by_index = {}
    for issue in issues:
        idx = issue["index"]
        by_index.setdefault(idx, []).append(issue)

    fix_counts = {}
    total_fixed = 0

    for idx, item_issues in sorted(by_index.items()):
        if idx >= len(data):
            continue
        act = data[idx].get("activity", {})
        title = data[idx].get("title", "")

        for issue in item_issues:
            t = issue["type"]
            fixed = False

            # E1: 활동명 → 원본 제목에서 추출한 이름으로 교체
            if t == "E1":
                new_name = extract_title_activity_name(title)
                if new_name:
                    act["name"] = new_name
                    fixed = True

            # E2: 학년 포맷 정규화
            elif t == "E2" and "fix" in issue:
                fix_val = issue["fix"]
                if fix_val:  # 빈 배열이 아니면 적용
                    act["suitable_grades"] = fix_val
                    fixed = True
                elif not fix_val and act.get("suitable_grades"):
                    # 빈 배열인 경우 원본 학년에서 재시도
                    grades = act.get("suitable_grades", [])
                    if isinstance(grades, str):
                        grades = [grades]
                    normalized = []
                    for g in grades:
                        normalized.extend(normalize_grade(g.strip("_").strip()))
                    normalized = sorted(set(normalized), key=lambda x: int(x[0]))
                    if normalized:
                        act["suitable_grades"] = normalized
                        fixed = True

            # E3: 공간 포맷 정규화
            elif t == "E3" and "fix" in issue:
                act["space"] = issue["fix"]
                fixed = True

            # E4: 코트세팅 → 표준 문구
            elif t == "E4":
                act["court_setup"] = COURT_SETUP_DEFAULT
                fixed = True

            # E8: 언더스코어 오염 제거
            elif t == "E8":
                field = issue["field"]
                if field in act:
                    act[field] = strip_underscores(act[field])
                    fixed = True

            if fixed:
                fix_counts[t] = fix_counts.get(t, 0) + 1
                total_fixed += 1

        data[idx]["activity"] = act

    # 저장
    ACTIVITIES_JSON.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    type_labels = {
        "E1": "활동명 불일치", "E2": "학년 포맷", "E3": "공간 포맷",
        "E4": "코트세팅", "E8": "언더스코어",
    }

    print(f"\n=== 수정 완료: {total_fixed}건 ===\n")
    for t in sorted(fix_counts.keys()):
        print(f"  {t} {type_labels.get(t, t)}: {fix_counts[t]}건 수정")

    print(f"\n→ {ACTIVITIES_JSON.name} 저장 완료")
    print(f"→ 원본 백업: {backup_path.name}")


if __name__ == "__main__":
    apply_fixes()
