import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFlowServer } from '@genkit-ai/express';

// Import flows (named exports for startFlowServer)
import { chatFlow } from './flows/chatFlow.js';
import { recommendFlow } from './flows/recommendFlow.js';
import { syncRecordsFlow } from './flows/syncRecordsFlow.js';
import { ingestDocumentFlow } from './flows/ingestDocumentFlow.js';
import { uploadPdfFlow } from './flows/uploadPdfFlow.js';
import { ingestYouTubeFlow } from './flows/ingestYouTubeFlow.js';

import { indexStaticData, indexYouTubeVideos } from './rag/indexer.js';
import type {
  Activity,
  CurriculumActivity,
  Sport,
  Skill,
  Standard,
  YouTubeVideo,
} from './rag/dataLoader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve paths relative to project root (server/../src/data)
const DATA_DIR = resolve(__dirname, '../../src/data');

function loadJson<T>(relativePath: string): T {
  const fullPath = resolve(DATA_DIR, relativePath);
  if (!existsSync(fullPath)) {
    console.warn(`[dataLoader] File not found: ${fullPath}`);
    return (Array.isArray(undefined) ? [] : {}) as T;
  }
  const raw = readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw) as T;
}

interface ActivitiesFile {
  activities: Activity[];
}
interface SportsFile {
  sports: Sport[];
}
interface SkillsFile {
  skills: Skill[];
}
interface CurriculumFile {
  activities: CurriculumActivity[];
}
interface StandardsFile {
  gradeBands: Record<
    string,
    {
      domains: Record<
        string,
        {
          standards: Standard[];
        }
      >;
    }
  >;
}

async function loadAndIndexStaticData(): Promise<void> {
  console.log('[startup] Loading static data from frontend...');

  // Load module data
  const activitiesFile = loadJson<ActivitiesFile>('modules/activities.json');
  const sportsFile = loadJson<SportsFile>('modules/sports.json');
  const skillsFile = loadJson<SkillsFile>('modules/skills.json');

  // Load curriculum activity files
  const gradeFiles = [
    'curriculum/activities/grade3_movement.json',
    'curriculum/activities/grade3_sports.json',
    'curriculum/activities/grade4_sports.json',
    'curriculum/activities/grade5_sports.json',
    'curriculum/activities/grade6_sports.json',
  ];

  const curriculumActivities: CurriculumActivity[] = [];
  for (const file of gradeFiles) {
    const fullPath = resolve(DATA_DIR, file);
    if (existsSync(fullPath)) {
      const data = loadJson<CurriculumFile>(file);
      if (data.activities) {
        curriculumActivities.push(...data.activities);
      }
    }
  }

  // Load standards
  const standardsFile = loadJson<StandardsFile>('curriculum/standards.json');
  const standards: { standard: Standard; grade: string; domain: string }[] = [];

  if (standardsFile.gradeBands) {
    for (const [grade, band] of Object.entries(standardsFile.gradeBands)) {
      if (band.domains) {
        for (const [domain, domainData] of Object.entries(band.domains)) {
          if (domainData.standards) {
            for (const std of domainData.standards) {
              standards.push({ standard: std, grade, domain });
            }
          }
        }
      }
    }
  }

  console.log(
    `[startup] Loaded: ${activitiesFile.activities?.length ?? 0} activities, ` +
      `${sportsFile.sports?.length ?? 0} sports, ` +
      `${skillsFile.skills?.length ?? 0} skills, ` +
      `${curriculumActivities.length} curriculum activities, ` +
      `${standards.length} standards`,
  );

  // Index all static data
  const result = await indexStaticData({
    activities: activitiesFile.activities ?? [],
    curriculumActivities,
    sports: sportsFile.sports ?? [],
    skills: skillsFile.skills ?? [],
    standards,
  });

  console.log(
    `[startup] Indexed: ${result.activitiesIndexed} activity docs, ` +
      `${result.curriculumIndexed} curriculum docs`,
  );
}

// --- YouTube 시드 데이터 인덱싱 (이미 완료된 것은 스킵) ---

const YT_INDEXED_PATH = resolve(__dirname, '../data/youtube-indexed-ids.json');

function loadIndexedIds(): Set<string> {
  if (!existsSync(YT_INDEXED_PATH)) return new Set();
  try {
    return new Set(JSON.parse(readFileSync(YT_INDEXED_PATH, 'utf-8')));
  } catch {
    return new Set();
  }
}

function saveIndexedIds(ids: Set<string>): void {
  writeFileSync(YT_INDEXED_PATH, JSON.stringify([...ids]), 'utf-8');
}

async function loadAndIndexYouTubeData(): Promise<void> {
  const ytPath = resolve(__dirname, '../data/youtube-activities.json');
  if (!existsSync(ytPath)) {
    console.log('[startup] YouTube 데이터 없음 (server/data/youtube-activities.json), 스킵');
    return;
  }

  const raw = readFileSync(ytPath, 'utf-8');
  const videos: YouTubeVideo[] = JSON.parse(raw);
  const peVideos = videos.filter((v) => v.is_pe_activity && v.activity);

  // 이미 인덱싱 완료된 ID 로드
  const indexedIds = loadIndexedIds();
  const remaining = peVideos.filter((v) => !indexedIds.has(v.video_id));

  console.log(`[startup] YouTube: 전체 ${peVideos.length}개 | 인덱싱 완료 ${indexedIds.size}개 | 남은 ${remaining.length}개`);

  if (remaining.length === 0) {
    console.log('[startup] YouTube 임베딩 이미 전부 완료!');
    return;
  }

  const result = await indexYouTubeVideos(remaining);

  // 완료된 ID 저장
  for (const v of remaining.slice(0, result.embedded)) {
    indexedIds.add(v.video_id);
  }
  saveIndexedIds(indexedIds);

  console.log(`[startup] YouTube 임베딩: ${result.embedded}개 추가 (총 ${indexedIds.size}개 완료)`);
}

// --- Server startup ---

async function main(): Promise<void> {
  console.log('[server] PE Genkit Server starting...');

  // Index static data on startup (완료 마커 파일로 중복 방지)
  const staticDonePath = resolve(__dirname, '../data/static-indexed.flag');
  if (existsSync(staticDonePath)) {
    console.log('[server] Static data already indexed, skipping.');
  } else {
    try {
      await loadAndIndexStaticData();
      writeFileSync(staticDonePath, new Date().toISOString(), 'utf-8');
      console.log('[server] Static data indexing complete.');
    } catch (error) {
      console.error('[server] Failed to index static data:', error);
      console.log('[server] Server will continue without indexed data.');
    }
  }

  // Index YouTube data on startup
  try {
    await loadAndIndexYouTubeData();
    console.log('[server] YouTube data indexing complete.');
  } catch (error) {
    console.error('[server] Failed to index YouTube data:', error);
    console.log('[server] Server will continue without YouTube indexed data.');
  }

  // Start HTTP flow server on port 3400
  const port = Number(process.env.PORT) || 3400;

  startFlowServer({
    flows: [chatFlow, recommendFlow, syncRecordsFlow, ingestDocumentFlow, uploadPdfFlow, ingestYouTubeFlow],
    port,
    cors: {
      origin: '*',  // dev mode: allow all origins
    },
    jsonParserOptions: { limit: '10mb' },  // PDF base64 uploads (5MB file → ~6.7MB base64)
  });

  console.log(`[server] Flow API server listening on http://localhost:${port}`);
  console.log('[server] Endpoints:');
  console.log(`  POST http://localhost:${port}/chatFlow`);
  console.log(`  POST http://localhost:${port}/recommendFlow`);
  console.log(`  POST http://localhost:${port}/syncRecordsFlow`);
  console.log(`  POST http://localhost:${port}/ingestDocumentFlow`);
  console.log(`  POST http://localhost:${port}/uploadPdfFlow`);
  console.log(`  POST http://localhost:${port}/ingestYouTubeFlow`);
}

main().catch(console.error);
