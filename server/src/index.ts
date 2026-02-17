import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFlowServer } from '@genkit-ai/express';

// Import flows (named exports for startFlowServer)
import { chatFlow } from './flows/chatFlow.js';
import { recommendFlow } from './flows/recommendFlow.js';
import { syncRecordsFlow } from './flows/syncRecordsFlow.js';
import { ingestDocumentFlow } from './flows/ingestDocumentFlow.js';
import { uploadPdfFlow } from './flows/uploadPdfFlow.js';

import { indexStaticData } from './rag/indexer.js';
import type {
  Activity,
  CurriculumActivity,
  Sport,
  Skill,
  Standard,
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

// --- Server startup ---

async function main(): Promise<void> {
  console.log('[server] PE Genkit Server starting...');

  // Index static data on startup
  try {
    await loadAndIndexStaticData();
    console.log('[server] Static data indexing complete.');
  } catch (error) {
    console.error('[server] Failed to index static data:', error);
    console.log('[server] Server will continue without indexed data.');
  }

  // Start HTTP flow server on port 3400
  const port = Number(process.env.PORT) || 3400;

  startFlowServer({
    flows: [chatFlow, recommendFlow, syncRecordsFlow, ingestDocumentFlow, uploadPdfFlow],
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
}

main().catch(console.error);
