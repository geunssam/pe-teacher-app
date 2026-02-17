/**
 * Rule-based intent parser for Korean PE teacher queries.
 * Extracts structured filters from natural language input.
 */

export interface ParsedFilters {
  sport?: string;
  space?: string;
  grade?: string;
  weather?: string;
  keywords: string[];
}

const SPORT_KEYWORDS: Record<string, string> = {
  축구: '축구',
  농구: '농구',
  피구: '피구',
  배구: '배구',
  족구: '손족구',
  손족구: '손족구',
  가가볼: '가가볼',
  술래: '술래 놀이',
  술래잡기: '술래 놀이',
  전래놀이: '전래 놀이',
  전래: '전래 놀이',
  컵스태킹: '컵 스태킹 놀이',
  컵쌓기: '컵 스태킹 놀이',
  핑거베이스볼: '핑거 베이스볼',
  핑거발리볼: '핑거 발리볼',
  컵배구: '컵 배구',
};

const SPACE_KEYWORDS: Record<string, string> = {
  교실: '교실',
  실내: '교실',
  운동장: '운동장',
  야외: '운동장',
  체육관: '체육관',
  강당: '체육관',
};

const GRADE_KEYWORDS: Record<string, string> = {
  '3학년': '3학년',
  '4학년': '4학년',
  '5학년': '5학년',
  '6학년': '6학년',
  저학년: '3학년',
  고학년: '5학년',
};

const WEATHER_KEYWORDS: Record<string, string> = {
  비: 'rainy',
  우천: 'rainy',
  비오는: 'rainy',
  맑은: 'sunny',
  맑음: 'sunny',
  더운: 'hot',
  더워: 'hot',
  추운: 'cold',
  추워: 'cold',
  미세먼지: 'dusty',
};

export function parseIntent(query: string): ParsedFilters {
  const result: ParsedFilters = { keywords: [] };

  for (const [keyword, value] of Object.entries(SPORT_KEYWORDS)) {
    if (query.includes(keyword)) {
      result.sport = value;
      break;
    }
  }

  for (const [keyword, value] of Object.entries(SPACE_KEYWORDS)) {
    if (query.includes(keyword)) {
      result.space = value;
      break;
    }
  }

  for (const [keyword, value] of Object.entries(GRADE_KEYWORDS)) {
    if (query.includes(keyword)) {
      result.grade = value;
      break;
    }
  }

  for (const [keyword, value] of Object.entries(WEATHER_KEYWORDS)) {
    if (query.includes(keyword)) {
      result.weather = value;
      break;
    }
  }

  // Extract remaining meaningful tokens as keywords
  const allMapped = [
    ...Object.keys(SPORT_KEYWORDS),
    ...Object.keys(SPACE_KEYWORDS),
    ...Object.keys(GRADE_KEYWORDS),
    ...Object.keys(WEATHER_KEYWORDS),
  ];

  const tokens = query
    .split(/[\s,]+/)
    .filter((t) => t.length >= 2)
    .filter((t) => !allMapped.includes(t));

  result.keywords = tokens;

  return result;
}
