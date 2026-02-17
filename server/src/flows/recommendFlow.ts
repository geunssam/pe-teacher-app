import { z } from 'genkit';
import { ai } from '../genkit.js';
import { searchActivities, searchRecords, searchKnowledge } from '../rag/retriever.js';
import { parseIntent } from '../utils/intentParser.js';

// --- Schemas ---

const RecommendInputSchema = z.object({
  query: z.string().describe('Natural language query from the teacher'),
  filters: z
    .object({
      grade: z.string().optional(),
      space: z.string().optional(),
      sport: z.string().optional(),
      weather: z.string().optional(),
      studentCount: z.number().optional(),
      duration: z.number().optional(),
    })
    .optional(),
  recentActivities: z
    .array(z.string())
    .optional()
    .describe('Recently used activity names to avoid repetition'),
});

const RecommendOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      activityId: z.string(),
      activityName: z.string(),
      reason: z.string(),
      teachingAdvice: z.string(),
      modifiers: z.array(z.string()),
      confidence: z.number(),
    }),
  ),
  summary: z.string(),
});

// --- System Prompt ---

const SYSTEM_PROMPT = `당신은 초등 체육 수업 설계 전문가입니다.
한국의 2022 개정 교육과정에 따라 수업 활동을 추천합니다.

규칙:
1. 반드시 [관련 활동]에서 선택하여 추천하세요.
2. 최근 사용한 활동은 피하세요.
3. 안전 규칙을 항상 포함하세요.
4. 추천 이유는 교육적 관점에서 2-3문장으로 설명하세요.
5. 수업 운영 팁은 현장 경험에 기반한 실용적 조언 1-2문장으로 작성하세요.

학년별 지도 원칙:
- 3-4학년: FMS(기본 움직임) 중심, 간단한 규칙, 기본 단계 구조 우선
- 5-6학년: 스포츠 기술 중심, 전술 이해, 응용-챌린지 단계 가능

응답 형식:
반드시 JSON으로 응답하세요. 각 추천에는 activityId, activityName, reason, teachingAdvice, modifiers (빈 배열 가능), confidence (0.0~1.0) 필드가 필요합니다.
summary는 전체 추천에 대한 1-2문장 요약입니다.`;

// --- Flow ---

export const recommendFlow = ai.defineFlow(
  {
    name: 'recommendFlow',
    inputSchema: RecommendInputSchema,
    outputSchema: RecommendOutputSchema,
  },
  async (input) => {
    // Parse intent from query for enriched search
    const parsed = parseIntent(input.query);

    // Build enriched search query
    const searchQuery = [
      input.query,
      parsed.sport ? `종목: ${parsed.sport}` : '',
      parsed.space ? `장소: ${parsed.space}` : '',
      parsed.grade ? `학년: ${parsed.grade}` : '',
      input.filters?.grade ? `학년: ${input.filters.grade}` : '',
      input.filters?.space ? `장소: ${input.filters.space}` : '',
      input.filters?.sport ? `종목: ${input.filters.sport}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    // RAG search in parallel
    const [activityDocs, recordDocs, knowledgeDocs] = await Promise.all([
      searchActivities(searchQuery, 8),
      searchRecords(searchQuery, 5),
      searchKnowledge(searchQuery, 3).catch(() => []),
    ]);

    // Build context for LLM
    const activityContext = activityDocs
      .map((doc) => doc.text)
      .join('\n---\n');

    const recordContext =
      recordDocs.length > 0
        ? recordDocs.map((doc) => doc.text).join('\n---\n')
        : '최근 수업 기록 없음';

    const recentList =
      input.recentActivities && input.recentActivities.length > 0
        ? input.recentActivities.join(', ')
        : '없음';

    const filtersText = input.filters
      ? [
          input.filters.grade ? `학년: ${input.filters.grade}` : '',
          input.filters.space ? `장소: ${input.filters.space}` : '',
          input.filters.sport ? `종목: ${input.filters.sport}` : '',
          input.filters.weather ? `날씨: ${input.filters.weather}` : '',
          input.filters.studentCount
            ? `학생 수: ${input.filters.studentCount}명`
            : '',
          input.filters.duration
            ? `수업 시간: ${input.filters.duration}분`
            : '',
        ]
          .filter(Boolean)
          .join(', ')
      : '제한 없음';

    const knowledgeContext =
      knowledgeDocs.length > 0
        ? knowledgeDocs.map((doc) => doc.text).join('\n---\n')
        : '';

    const userPrompt = `[교사 요청]
${input.query}

[필터 조건]
${filtersText}

[최근 사용 활동 (중복 피하기)]
${recentList}

[관련 활동]
${activityContext}

[최근 수업 기록]
${recordContext}
${knowledgeContext ? `\n[교사 참고 자료]\n${knowledgeContext}` : ''}

위 관련 활동 중에서 3개를 추천해 주세요. 교사 참고 자료가 있다면 적극 반영하세요.`;

    const result = await ai.generate({
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      output: {
        format: 'json',
        schema: RecommendOutputSchema,
      },
    });

    const output = result.output;
    if (!output) {
      return {
        recommendations: [],
        summary: '추천 결과를 생성하지 못했습니다.',
      };
    }
    return output;
  },
);
