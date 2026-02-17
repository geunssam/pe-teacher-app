import { Document } from 'genkit/retriever';

// --- Activity data shape (from src/data/modules/activities.json) ---

export interface Activity {
  id: string;
  name: string;
  sportId?: string;
  suitablePhase?: string;
  space?: string[];
  groupSize?: number;
  baseDurationMin?: number;
  difficultyBase?: number;
  compatibleFmsCategories?: string[];
  flow?: string[];
  teachingTips?: string[];
  equipment?: string[];
  description?: string;
}

// --- Curriculum activity shape (from src/data/curriculum/activities/*.json) ---

export interface CurriculumActivity {
  id: string;
  name: string;
  source?: string;
  standardCodes?: string[];
  fmsCategories?: string[];
  fmsSkills?: string[];
  acePhase?: string;
  space?: string[];
  groupSize?: { min: number; max: number };
  durationMin?: number;
  equipment?: string[];
  flow?: string[];
  rules?: string[];
  teachingTips?: string[];
  difficulty?: number;
  description?: string;
}

// --- Sport shape (from src/data/modules/sports.json) ---

export interface Sport {
  id: string;
  name: string;
  domain?: string;
  subDomain?: string;
  fmsGroup?: string[];
  coreRules?: string[];
  requiredConcepts?: string[];
  safetyRules?: string[];
  defaultEquipment?: string[];
  skills?: string[];
}

// --- Skill shape (from src/data/modules/skills.json) ---

export interface Skill {
  id: string;
  name: string;
  sport?: string;
  fms?: string[];
  fmsCategory?: string;
  gradeRange?: string[];
  spaceNeeded?: string[];
  equipment?: string[];
  slotMapping?: Record<string, string>;
  teachingCues?: string[];
  commonErrors?: string[];
  quickFixes?: string[];
  description?: string;
}

// --- Standard shape (from src/data/curriculum/standards.json) ---

export interface Standard {
  code: string;
  text: string;
  explanation?: string;
  fmsCategories?: string[];
}

// --- Knowledge chunk shape (uploaded by teacher) ---

export interface KnowledgeChunk {
  id: string;
  docId: string;
  title: string;
  content: string;
  chunkIndex: number;
  sourceType: 'pdf' | 'text';
}

export function knowledgeChunkToDocument(chunk: KnowledgeChunk): Document {
  const text = [
    `제목: ${chunk.title}`,
    `출처: ${chunk.sourceType === 'pdf' ? 'PDF 업로드' : '텍스트 입력'}`,
    `내용:\n${chunk.content}`,
  ].join('\n');

  return Document.fromText(text, {
    docId: chunk.docId,
    chunkIndex: chunk.chunkIndex,
    sourceType: chunk.sourceType,
    title: chunk.title,
  });
}

// --- Class record shape (from localStorage pe_class_records) ---

export interface ClassRecord {
  id: string;
  classDate: string;
  className?: string;
  activity: string;
  domain?: string;
  sequence?: number;
  performance?: string;
  memo?: string;
  classId?: string;
}

// --- Document converters ---

export function activityToDocument(activity: Activity): Document {
  const text = [
    `활동명: ${activity.name}`,
    `종목ID: ${activity.sportId ?? '미지정'}`,
    `장소: ${activity.space?.join(', ') ?? '미지정'}`,
    `인원: ${activity.groupSize ?? '미지정'}명`,
    `소요시간: ${activity.baseDurationMin ?? '미지정'}분`,
    `단계: ${activity.suitablePhase ?? '미지정'}`,
    `난이도: ${activity.difficultyBase ?? 0}/3`,
    `FMS 영역: ${activity.compatibleFmsCategories?.join(', ') ?? '없음'}`,
    `설명: ${activity.description ?? ''}`,
    `진행 흐름: ${activity.flow?.map((f, i) => `${i + 1}. ${f}`).join(' ') ?? ''}`,
    `지도 팁: ${activity.teachingTips?.join(' ') ?? ''}`,
    `필요 장비: ${activity.equipment?.join(', ') ?? '없음'}`,
  ].join('\n');

  return Document.fromText(text, {
    activityId: activity.id,
    sport: activity.sportId,
    space: activity.space,
    phase: activity.suitablePhase,
    difficulty: activity.difficultyBase,
  });
}

export function curriculumActivityToDocument(
  activity: CurriculumActivity,
): Document {
  const text = [
    `활동명: ${activity.name}`,
    `출처: ${activity.source ?? '미지정'}`,
    `성취기준: ${activity.standardCodes?.join(', ') ?? '없음'}`,
    `ACE 단계: ${activity.acePhase ?? '미지정'}`,
    `FMS 영역: ${activity.fmsCategories?.join(', ') ?? '없음'}`,
    `FMS 기술: ${activity.fmsSkills?.join(', ') ?? '없음'}`,
    `장소: ${activity.space?.join(', ') ?? '미지정'}`,
    `인원: ${activity.groupSize ? `${activity.groupSize.min}~${activity.groupSize.max}` : '미지정'}명`,
    `소요시간: ${activity.durationMin ?? '미지정'}분`,
    `난이도: ${activity.difficulty ?? 0}/3`,
    `설명: ${activity.description ?? ''}`,
    `진행 흐름: ${activity.flow?.map((f, i) => `${i + 1}. ${f}`).join(' ') ?? ''}`,
    `규칙: ${activity.rules?.join(' ') ?? '없음'}`,
    `지도 팁: ${activity.teachingTips?.join(' ') ?? ''}`,
    `필요 장비: ${activity.equipment?.join(', ') ?? '없음'}`,
  ].join('\n');

  return Document.fromText(text, {
    activityId: activity.id,
    standardCodes: activity.standardCodes,
    acePhase: activity.acePhase,
    space: activity.space,
    difficulty: activity.difficulty,
  });
}

export function sportToDocument(sport: Sport): Document {
  const text = [
    `종목명: ${sport.name}`,
    `영역: ${sport.domain ?? '미지정'}`,
    `하위영역: ${sport.subDomain ?? '미지정'}`,
    `FMS 그룹: ${sport.fmsGroup?.join(', ') ?? '없음'}`,
    `핵심 규칙: ${sport.coreRules?.join(', ') ?? '없음'}`,
    `필수 개념: ${sport.requiredConcepts?.join(', ') ?? '없음'}`,
    `안전 규칙: ${sport.safetyRules?.join(', ') ?? '없음'}`,
    `기본 장비: ${sport.defaultEquipment?.join(', ') ?? '없음'}`,
  ].join('\n');

  return Document.fromText(text, {
    sportId: sport.id,
    domain: sport.domain,
    subDomain: sport.subDomain,
  });
}

export function skillToDocument(skill: Skill): Document {
  const text = [
    `기술명: ${skill.name}`,
    `종목: ${skill.sport ?? '미지정'}`,
    `FMS: ${skill.fms?.join(', ') ?? '없음'}`,
    `FMS 영역: ${skill.fmsCategory ?? '미지정'}`,
    `대상 학년: ${skill.gradeRange?.join(', ') ?? '미지정'}`,
    `필요 공간: ${skill.spaceNeeded?.join(', ') ?? '미지정'}`,
    `장비: ${skill.equipment?.join(', ') ?? '없음'}`,
    `지도 큐: ${skill.teachingCues?.join(', ') ?? '없음'}`,
    `일반 오류: ${skill.commonErrors?.join(', ') ?? '없음'}`,
    `빠른 수정: ${skill.quickFixes?.join(', ') ?? '없음'}`,
    `설명: ${skill.description ?? ''}`,
  ].join('\n');

  return Document.fromText(text, {
    skillId: skill.id,
    sport: skill.sport,
    fmsCategory: skill.fmsCategory,
    gradeRange: skill.gradeRange,
  });
}

export function standardToDocument(
  standard: Standard,
  grade: string,
  domain: string,
): Document {
  const text = [
    `성취기준 코드: ${standard.code}`,
    `학년군: ${grade}`,
    `영역: ${domain}`,
    `내용: ${standard.text}`,
    `해설: ${standard.explanation ?? ''}`,
    `FMS 영역: ${standard.fmsCategories?.join(', ') ?? '없음'}`,
  ].join('\n');

  return Document.fromText(text, {
    code: standard.code,
    grade,
    domain,
    fmsCategories: standard.fmsCategories,
  });
}

export function recordToDocument(record: ClassRecord): Document {
  const text = [
    `수업일: ${record.classDate}`,
    `학급: ${record.className ?? '미지정'}`,
    `활동명: ${record.activity}`,
    `영역: ${record.domain ?? '미지정'}`,
    `차시: ${record.sequence ?? 0}`,
    `수행도: ${record.performance ?? '미평가'}`,
    `교사 메모: ${record.memo ?? ''}`,
  ].join('\n');

  return Document.fromText(text, {
    recordId: record.id,
    classId: record.classId,
    domain: record.domain,
    performance: record.performance,
    classDate: record.classDate,
  });
}
