import { devLocalIndexerRef } from '@genkit-ai/dev-local-vectorstore';
import { ai } from '../genkit.js';
import type { Document } from 'genkit/retriever';
import {
  activityToDocument,
  curriculumActivityToDocument,
  sportToDocument,
  skillToDocument,
  standardToDocument,
  recordToDocument,
  type Activity,
  type CurriculumActivity,
  type Sport,
  type Skill,
  type Standard,
  type ClassRecord,
} from './dataLoader.js';

const activityIndexer = devLocalIndexerRef('pe_activities');
const curriculumIndexer = devLocalIndexerRef('pe_curriculum');
const recordIndexer = devLocalIndexerRef('pe_records');

// --- Rate-limit-safe batch indexing ---

const BATCH_SIZE = 5; // 무료 티어: 분당 100회 → 5개씩 안전하게
const BATCH_DELAY_MS = 4000; // 배치 간 4초 대기 (분당 ~75회 페이스)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function indexInBatches(
  indexer: ReturnType<typeof devLocalIndexerRef>,
  documents: Document[],
  label: string,
): Promise<number> {
  if (documents.length === 0) return 0;

  let indexed = 0;
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const attempt = async (retries: number): Promise<void> => {
      try {
        await ai.index({ indexer, documents: batch });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if ((msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) && retries > 0) {
          const waitSec = Math.min(90, 30 * (4 - retries));
          console.log(`[indexer] ${label} 배치 ${Math.floor(i / BATCH_SIZE) + 1} 속도 제한, ${waitSec}초 후 재시도 (남은 ${retries}회)...`);
          await sleep(waitSec * 1000);
          return attempt(retries - 1);
        }
        throw err;
      }
    };
    await attempt(3);
    indexed += batch.length;
    console.log(`[indexer] ${label}: ${indexed}/${documents.length} 완료`);
    if (i + BATCH_SIZE < documents.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
  return indexed;
}

/**
 * Index static data (activities, sports, skills, curriculum standards)
 * Runs once on server startup with rate-limit-safe batching.
 */
export async function indexStaticData(data: {
  activities: Activity[];
  curriculumActivities: CurriculumActivity[];
  sports: Sport[];
  skills: Skill[];
  standards: { standard: Standard; grade: string; domain: string }[];
}): Promise<{ activitiesIndexed: number; curriculumIndexed: number }> {
  // Build activity documents: module activities + sports + skills
  const activityDocs = [
    ...data.activities.map(activityToDocument),
    ...data.sports.map(sportToDocument),
    ...data.skills.map(skillToDocument),
  ];

  // Build curriculum documents: curriculum activities + standards
  const curriculumDocs = [
    ...data.curriculumActivities.map(curriculumActivityToDocument),
    ...data.standards.map((s) =>
      standardToDocument(s.standard, s.grade, s.domain),
    ),
  ];

  // Index sequentially to respect rate limits (NOT parallel)
  const activitiesIndexed = await indexInBatches(activityIndexer, activityDocs, '활동');
  const curriculumIndexed = await indexInBatches(curriculumIndexer, curriculumDocs, '교육과정');

  return { activitiesIndexed, curriculumIndexed };
}

/**
 * Incrementally index new class records.
 * Called when the frontend syncs records to the server.
 */
export async function indexRecords(
  records: ClassRecord[],
): Promise<{ embedded: number }> {
  if (records.length === 0) {
    return { embedded: 0 };
  }

  const embedded = await indexInBatches(recordIndexer, records.map(recordToDocument), '수업기록');
  return { embedded };
}
