"""크롤러 설정"""
from pathlib import Path

# 경로 설정
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
STRUCTURED_DIR = DATA_DIR / "structured"

# 입력 파일
VIDEOS_TXT = Path.home() / "Desktop" / "양수쌤 유튜브 노트북" / "양수쌤 유튜브 링크.txt"
SHORTS_TXT = Path.home() / "Desktop" / "양수쌤 쇼츠.txt"

# 출력 파일
VIDEOS_JSON = RAW_DIR / "videos.json"
PROGRESS_JSON = RAW_DIR / "progress.json"
ERRORS_JSON = RAW_DIR / "errors.json"
ACTIVITIES_JSON = STRUCTURED_DIR / "activities.json"

# 크롤링 설정
MIN_DELAY = 1.0  # 최소 딜레이 (초)
MAX_DELAY = 2.0  # 최대 딜레이 (초)
BATCH_SIZE = 50   # 저장 간격 (n개마다 저장)

# .env 파일에서 API 키 로드
ENV_FILE = Path.home() / "Desktop" / "PEhub" / "server" / ".env"

# Gemini 설정
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_BATCH_SIZE = 5       # 한 번에 처리할 영상 수
GEMINI_BATCH_DELAY = 35     # 배치 간 딜레이 (초) - 무료 티어 제한
