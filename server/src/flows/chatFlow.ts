import { z } from 'genkit';
import { ai } from '../genkit.js';
import { searchActivities, searchCurriculum, searchKnowledge } from '../rag/retriever.js';

const ChatInputSchema = z.object({
  message: z.string().describe('User message'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
      }),
    )
    .optional()
    .describe('Conversation history'),
  lessonContext: z.any().optional().describe('Lesson card context from gatherLessonCardContext'),
});

const ChatOutputSchema = z.string();

const CHAT_SYSTEM_PROMPT = `당신은 초등 체육 수업 전문 AI 어시스턴트입니다.
한국의 2022 개정 체육과 교육과정에 대한 전문 지식을 바탕으로 교사의 질문에 답변합니다.

역할:
- 수업 활동 추천 및 설명
- 교육과정 성취기준 안내
- 수업 운영 팁 제공
- FMS(기본 움직임 기술) 관련 조언

답변 원칙:
- 한국어로 답변합니다.
- 간결하고 실용적인 답변을 제공합니다.
- 안전 관련 내용은 반드시 포함합니다.
- 관련 활동이 있으면 구체적으로 안내합니다.
- [교사 업로드 자료]가 있으면 적극 참고하여 답변합니다.
- 마크다운 서식을 사용하지 마세요. 볼드(**), 이탈릭(*), 헤딩(#), 코드블록(\`) 등의 마크다운 문법을 쓰지 않고 일반 텍스트로만 답변합니다. 목록은 "- " 대시 기호만 허용합니다.`;

export const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    // RAG: search for relevant context (parallel)
    const [activityDocs, curriculumDocs, knowledgeDocs] = await Promise.all([
      searchActivities(input.message, 5),
      searchCurriculum(input.message, 3),
      searchKnowledge(input.message, 3).catch(() => []),
    ]);

    const contextParts: string[] = [];

    if (activityDocs.length > 0) {
      contextParts.push(
        '[관련 활동 정보]',
        activityDocs.map((doc) => doc.text).join('\n---\n'),
      );
    }

    if (curriculumDocs.length > 0) {
      contextParts.push(
        '[교육과정 정보]',
        curriculumDocs.map((doc) => doc.text).join('\n---\n'),
      );
    }

    if (knowledgeDocs.length > 0) {
      contextParts.push(
        '[교사 업로드 자료]',
        knowledgeDocs.map((doc) => doc.text).join('\n---\n'),
      );
    }

    // Build messages from history
    const messages: Array<{ role: 'user' | 'model'; content: Array<{ text: string }> }> =
      (input.history ?? []).map((h) => ({
        role: h.role,
        content: [{ text: h.content }],
      }));

    // Build lesson context prefix if available
    if (input.lessonContext) {
      const lc = input.lessonContext;
      const lcParts: string[] = ['[차시 컨텍스트]'];
      if (lc.unitInfo) {
        lcParts.push(`단원: ${lc.unitInfo.title} (${lc.unitInfo.grade}, ${lc.unitInfo.domain})`);
      }
      if (lc.lessonInfo) {
        lcParts.push(`차시: ${lc.lessonInfo.lesson}차시 - ${lc.lessonInfo.title}`);
        if (lc.lessonInfo.acePhase) lcParts.push(`ACE: ${lc.lessonInfo.acePhase}`);
      }
      if (lc.activities?.length) {
        lcParts.push(`활동: ${lc.activities.map((a: { name: string }) => a.name).join(', ')}`);
      }
      if (lc.standards?.length) {
        lcParts.push(`성취기준: ${lc.standards.map((s: { code: string; text: string }) => `${s.code} ${s.text}`).join(' / ')}`);
      }
      contextParts.unshift(lcParts.join('\n'));
    }

    // Append current message with RAG context
    const enrichedMessage =
      contextParts.length > 0
        ? `${input.message}\n\n${contextParts.join('\n\n')}`
        : input.message;

    messages.push({
      role: 'user',
      content: [{ text: enrichedMessage }],
    });

    const result = await ai.generate({
      system: CHAT_SYSTEM_PROMPT,
      messages,
    });

    return result.text;
  },
);
