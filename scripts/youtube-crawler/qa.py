"""
QA 스크립트: activities.json을 읽기 전용으로 검사하여 qa_issues.json에 오류 목록 저장
구조화 진행 중 병렬 실행 가능 (activities.json 수정하지 않음)
"""
import json
import re
import sys
from pathlib import Path
from difflib import SequenceMatcher

STRUCTURED_DIR = Path(__file__).parent / "data" / "structured"
ACTIVITIES_JSON = STRUCTURED_DIR / "activities.json"
QA_ISSUES_JSON = STRUCTURED_DIR / "qa_issues.json"

VALID_GRADES = ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"]
VALID_SPACES = ["교실", "체육관", "운동장"]
VALID_DOMAINS = ["스포츠", "건강", "표현", "여가"]

# 코트세팅 무의미 패턴
USELESS_COURT_PATTERNS = [
    "영상을 보고", "영상을 참고", "영상에서 확인", "확인하세요",
    "별도의 경기장", "특별한 세팅 없", "없음", "N/A", "없습니다",
    "특정 경기장", "특별한 경기장",
]

# 공간 매핑 (비표준 → 표준)
SPACE_ALIASES = {
    "강당": "체육관",
    "다목적실": "체육관",
    "실내": "체육관",
    "야외": "운동장",
    "넓은 공간": "운동장",
}


def strip_underscores(val):
    """마크다운 이탤릭 언더스코어 제거 (재귀적으로 문자열/리스트/딕셔너리 처리)"""
    if isinstance(val, str):
        return val.strip("_").strip()
    if isinstance(val, list):
        return [strip_underscores(v) for v in val]
    if isinstance(val, dict):
        return {k: strip_underscores(v) for k, v in val.items()}
    return val


def has_underscore_pollution(val) -> bool:
    """값에 마크다운 언더스코어가 섞여있는지 체크"""
    if isinstance(val, str):
        return val.startswith("_") or val.endswith("_")
    if isinstance(val, list):
        return any(has_underscore_pollution(v) for v in val)
    return False


def extract_title_activity_name(title: str) -> str:
    """원본 제목에서 활동명 부분 추출"""
    # 대괄호 태그 제거: [양수쌤 놀이체육] → 빈문자열
    cleaned = re.sub(r"\[.*?\]", "", title).strip()

    # 구분자 뒤의 실제 활동명 추출: "~ - '빙고 볼링'" → "빙고 볼링"
    # 패턴: 따옴표로 감싸진 부분
    quoted = re.findall(r"['\u2018\u2019\u201C\u201D]([^'\u2018\u2019\u201C\u201D]+)['\u2018\u2019\u201C\u201D]", cleaned)
    if quoted:
        return quoted[-1].strip().rstrip("!?~.")

    # 패턴: " - " 뒤의 부분
    if " - " in cleaned:
        after_dash = cleaned.split(" - ")[-1].strip()
        return after_dash.rstrip("!?~.")

    # 끝의 느낌표, 물음표 등 제거
    return cleaned.rstrip("!?~.")


def normalize_grade(grade_str: str) -> list[str]:
    """학년 문자열을 정규화된 학년 리스트로 변환"""
    # 언더스코어 제거
    grade_str = grade_str.strip("_").strip()

    # "전학년", "초등전학년", "모든" 처리
    if "전학년" in grade_str or "모든" in grade_str:
        return VALID_GRADES.copy()

    # "고학년" → 5,6학년
    if "고학년" in grade_str:
        result = ["5학년", "6학년"]
        # "고학년" 앞에 "저학년"도 있으면 추가
        if "저학년" in grade_str:
            result = ["1학년", "2학년"] + result
        if "중학년" in grade_str:
            result = ["3학년", "4학년"] + result
        return sorted(set(result), key=lambda x: int(x[0]))

    # "저학년" → 1,2학년
    if "저학년" in grade_str:
        return ["1학년", "2학년"]

    # "중학년" → 3,4학년
    if "중학년" in grade_str:
        return ["3학년", "4학년"]

    result = []

    # "3-6" 같은 범위 패턴 처리 (숫자 추출보다 먼저)
    ranges = re.findall(r"(\d)\s*[-~]\s*(\d)", grade_str)
    for start, end in ranges:
        for n in range(int(start), int(end) + 1):
            if 1 <= n <= 6:
                g = f"{n}학년"
                if g not in result:
                    result.append(g)

    if not result:
        # 개별 숫자 추출
        numbers = re.findall(r"(\d)", grade_str)
        for n in numbers:
            n_int = int(n)
            if 1 <= n_int <= 6:
                g = f"{n_int}학년"
                if g not in result:
                    result.append(g)

    # "이상" 패턴: "4학년 이상" → 4,5,6학년
    above_match = re.search(r"(\d)\s*학년\s*이상", grade_str)
    if above_match:
        start = int(above_match.group(1))
        result = []
        for n in range(start, 7):
            g = f"{n}학년"
            if g not in result:
                result.append(g)

    result.sort(key=lambda x: int(x[0]))
    return result


def normalize_space(space) -> list[str]:
    """공간 필드를 정규화된 배열로 변환"""
    if isinstance(space, str):
        space = [space]
    result = []
    for s in (space or []):
        s_clean = s.strip("_").strip()
        matched = False
        # 표준 공간명 매칭
        for valid in VALID_SPACES:
            if valid in s_clean and valid not in result:
                result.append(valid)
                matched = True
        # 별칭 매핑
        if not matched:
            for alias, target in SPACE_ALIASES.items():
                if alias in s_clean and target not in result:
                    result.append(target)
                    matched = True
    # 매칭 안 되면 원본 유지
    if not result and space:
        result = [s.strip("_").strip() for s in space]
    return result


def is_useless_court_setup(court: str) -> bool:
    """코트세팅이 무의미한 값인지 체크"""
    if not court:
        return True
    court_lower = court.strip("_").strip().lower()
    if len(court_lower) < 5:
        return True
    return any(p in court_lower for p in USELESS_COURT_PATTERNS)


def check_activity(idx: int, item: dict) -> list[dict]:
    """단일 활동 QA 검사 → 이슈 리스트 반환"""
    issues = []
    act = item.get("activity", {})
    title = item.get("title", "")
    video_id = item.get("video_id", "")

    base = {"index": idx, "video_id": video_id, "title": title}

    # E7: PE 분류 의심 — 비체육인데 체육 키워드가 있는 경우
    if not item.get("is_pe_activity"):
        pe_keywords = ["체육", "수업", "게임", "술래", "피구", "농구", "축구", "배구",
                       "줄넘기", "달리기", "던지기", "운동", "스포츠", "활동"]
        title_lower = title.lower()
        matched_kw = [kw for kw in pe_keywords if kw in title_lower]
        if len(matched_kw) >= 2:
            issues.append({
                **base, "type": "E7", "field": "is_pe_activity",
                "message": f"비체육 분류이나 체육 키워드 다수: {matched_kw}",
            })
        return issues  # 비체육은 나머지 스킵

    # E8: 언더스코어 오염 — 모든 필드 검사
    for field in ["name", "summary", "domain", "court_setup"]:
        val = act.get(field, "")
        if has_underscore_pollution(val):
            issues.append({
                **base, "type": "E8", "field": field,
                "message": f"언더스코어 오염: {field}",
                "current": val, "fix": strip_underscores(val),
            })
    for field in ["suitable_grades", "space", "equipment", "cautions", "steps"]:
        val = act.get(field, [])
        if has_underscore_pollution(val):
            issues.append({
                **base, "type": "E8", "field": field,
                "message": f"언더스코어 오염: {field}",
                "current": val, "fix": strip_underscores(val),
            })

    # E1: 활동명 불일치
    act_name = strip_underscores(act.get("name", ""))
    title_name = extract_title_activity_name(title)
    if act_name and title_name:
        similarity = SequenceMatcher(None, title_name, act_name).ratio()
        if similarity < 0.5:
            issues.append({
                **base, "type": "E1", "field": "name",
                "message": f"활동명 불일치 (유사도 {similarity:.0%})",
                "current": act_name, "expected": title_name,
            })

    # E2: 학년 포맷
    grades = act.get("suitable_grades", [])
    if isinstance(grades, str):
        grades = [grades]
    # 언더스코어 제거 후 정규화
    clean_grades = [g.strip("_").strip() for g in grades]
    normalized_grades = []
    for g in clean_grades:
        normalized_grades.extend(normalize_grade(g))
    normalized_grades = sorted(set(normalized_grades), key=lambda x: int(x[0]))

    has_format_issue = False
    for g in clean_grades:
        if g not in VALID_GRADES:
            has_format_issue = True
            break

    if has_format_issue:
        issues.append({
            **base, "type": "E2", "field": "suitable_grades",
            "message": "학년 포맷 비표준",
            "current": grades, "fix": normalized_grades,
        })

    # 학년 빈 배열 경고
    if not normalized_grades and not grades:
        issues.append({
            **base, "type": "E2", "field": "suitable_grades",
            "message": "학년 정보 없음",
            "current": grades, "fix": [],
        })

    # E3: 공간 포맷
    space = act.get("space", [])
    if isinstance(space, str):
        issues.append({
            **base, "type": "E3", "field": "space",
            "message": "공간이 문자열 (배열이어야 함)",
            "current": space, "fix": normalize_space(space),
        })
    elif space:
        clean_space = [s.strip("_").strip() for s in space]
        for s in clean_space:
            if s not in VALID_SPACES:
                issues.append({
                    **base, "type": "E3", "field": "space",
                    "message": f"비표준 공간값: {s}",
                    "current": space, "fix": normalize_space(space),
                })
                break

    # E4: 코트세팅 무의미
    court = act.get("court_setup", "")
    if is_useless_court_setup(court):
        issues.append({
            **base, "type": "E4", "field": "court_setup",
            "message": "코트세팅 무의미한 값",
            "current": court,
            "fix": "경기장 세팅 등 세부적 내용은 영상을 참고해주세요.",
        })

    # E5: 빈 필드
    for field in ["steps", "summary", "name"]:
        val = act.get(field)
        if not val or (isinstance(val, list) and len(val) == 0):
            issues.append({
                **base, "type": "E5", "field": field,
                "message": f"{field} 비어있음",
            })

    # E6: 도메인 오분류 (언더스코어 제거 후 체크)
    domain = strip_underscores(act.get("domain", ""))
    if domain and domain not in VALID_DOMAINS:
        issues.append({
            **base, "type": "E6", "field": "domain",
            "message": f"비표준 도메인: {domain}",
            "current": act.get("domain", ""),
            "fix_note": f"유효값: {VALID_DOMAINS}",
        })
    if not domain:
        issues.append({
            **base, "type": "E6", "field": "domain",
            "message": "도메인 없음",
        })

    # E9: 요약 너무 짧거나 너무 김
    summary = act.get("summary", "")
    if summary and len(summary) < 20:
        issues.append({
            **base, "type": "E9", "field": "summary",
            "message": f"요약 너무 짧음 ({len(summary)}자)",
            "current": summary,
        })
    if summary and len(summary) > 500:
        issues.append({
            **base, "type": "E9", "field": "summary",
            "message": f"요약 너무 김 ({len(summary)}자)",
        })

    # E10: steps 단계 수 이상 (1개이거나 10개 초과)
    steps = act.get("steps", [])
    if isinstance(steps, list):
        if len(steps) == 1:
            issues.append({
                **base, "type": "E10", "field": "steps",
                "message": "진행 순서 1단계뿐 (너무 적음)",
                "current": steps,
            })
        elif len(steps) > 10:
            issues.append({
                **base, "type": "E10", "field": "steps",
                "message": f"진행 순서 {len(steps)}단계 (너무 많음)",
            })

    return issues


def run_qa(limit: int = None):
    """QA 실행"""
    if not ACTIVITIES_JSON.exists():
        print("activities.json이 없습니다.")
        return

    data = json.loads(ACTIVITIES_JSON.read_text(encoding="utf-8"))

    if limit:
        data = data[:limit]
        print(f"=== QA 실행: 1~{limit}번 ===\n")
    else:
        print(f"=== QA 전체 실행: {len(data)}개 ===\n")

    all_issues = []
    for i, item in enumerate(data):
        issues = check_activity(i, item)
        all_issues.extend(issues)

    # 타입별 집계
    type_counts = {}
    for issue in all_issues:
        t = issue["type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    type_labels = {
        "E1": "활동명 불일치",
        "E2": "학년 포맷 비표준",
        "E3": "공간 포맷 비표준",
        "E4": "코트세팅 무의미",
        "E5": "빈 필드",
        "E6": "도메인 오분류",
        "E7": "PE 분류 의심",
        "E8": "언더스코어 오염",
        "E9": "요약 길이 이상",
        "E10": "진행 순서 수 이상",
    }

    # 요약 출력
    print(f"검사 대상: {len(data)}개")
    print(f"발견된 이슈: {len(all_issues)}개\n")
    print("--- 카테고리별 집계 ---")
    for t in sorted(type_counts.keys()):
        label = type_labels.get(t, t)
        auto = "자동수정" if t in ("E2", "E3", "E4", "E8") else "수동검수"
        print(f"  {t} {label}: {type_counts[t]}건 ({auto})")

    # 상세 출력
    print(f"\n--- 상세 이슈 ---")
    for issue in all_issues:
        print(f"  [{issue['type']}] #{issue['index']+1} {issue['title'][:50]}")
        print(f"       {issue['message']}")
        if "current" in issue:
            cur = issue["current"]
            if isinstance(cur, str) and len(cur) > 80:
                cur = cur[:80] + "..."
            print(f"       현재: {cur}")
        if "fix" in issue:
            print(f"       수정: {issue['fix']}")
        if "expected" in issue:
            print(f"       기대: {issue['expected']}")
        if "fix_note" in issue:
            print(f"       참고: {issue['fix_note']}")
        print()

    # 저장
    QA_ISSUES_JSON.write_text(
        json.dumps(all_issues, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"→ {QA_ISSUES_JSON} 에 저장 완료")


if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    run_qa(limit)
