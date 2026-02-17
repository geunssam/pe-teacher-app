import { devLocalRetrieverRef } from '@genkit-ai/dev-local-vectorstore';
import { ai } from '../genkit.js';
import type { Document } from 'genkit/retriever';

const activityRetriever = devLocalRetrieverRef('pe_activities');
const curriculumRetriever = devLocalRetrieverRef('pe_curriculum');
const recordRetriever = devLocalRetrieverRef('pe_records');
const knowledgeRetriever = devLocalRetrieverRef('pe_knowledge');

/**
 * Search activities, sports, and skills by semantic similarity.
 */
export async function searchActivities(
  query: string,
  k: number = 8,
): Promise<Document[]> {
  return ai.retrieve({
    retriever: activityRetriever,
    query,
    options: { k },
  });
}

/**
 * Search curriculum standards and curriculum activities.
 */
export async function searchCurriculum(
  query: string,
  k: number = 5,
): Promise<Document[]> {
  return ai.retrieve({
    retriever: curriculumRetriever,
    query,
    options: { k },
  });
}

/**
 * Search past class records by semantic similarity.
 */
export async function searchRecords(
  query: string,
  k: number = 5,
): Promise<Document[]> {
  return ai.retrieve({
    retriever: recordRetriever,
    query,
    options: { k },
  });
}

/**
 * Search teacher-uploaded knowledge documents by semantic similarity.
 */
export async function searchKnowledge(
  query: string,
  k: number = 5,
): Promise<Document[]> {
  return ai.retrieve({
    retriever: knowledgeRetriever,
    query,
    options: { k },
  });
}
