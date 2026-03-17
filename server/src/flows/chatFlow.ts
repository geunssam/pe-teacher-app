import { z } from 'genkit';
import { ai } from '../genkit.js';
import { searchActivities, searchCurriculum, searchKnowledge, searchYouTube } from '../rag/retriever.js';

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
한국의 2022 개정 체육과 교육과정(3~6학년 전 학년 적용)에 대한 전문 지식을 바탕으로 교사의 질문에 답변합니다.
2015 개정 교육과정 정보는 사용하지 마세요.
모든 수업은 'ACE 체육 모형'에 맞춰 설계합니다.

## ACE 체육 모형 (Acquire - Challenge - Engage)

수업 흐름: 도입 → Acquire → Challenge → Engage → 마무리

1) Acquire (기능 습득) — 5~7분
- 목표: 학생들이 기본 기능을 정확하고 안전하게 익히도록 돕는다.
- 활동: 짧고 집중적인 드릴
- 피드백: 교사 중심의 즉각적 교정 및 칭찬
- 흐름: 쉬운 순서 → 어려운 순서, 단순 동작 → 복합 동작

2) Challenge (미니 챌린지) — 10~12분
- 목표: 배운 기능을 개인 또는 소그룹 과제로 도전하며 자신감과 몰입을 이끌어낸다.
- 활동: 장애물 드리블 타임 어택, 미션 카드 기반 과제, 1대1 패스 배틀 등
- 피드백: 동기 부여 멘트, 즉흥적 제안

3) Engage (게임 참여) — 10분
- 목표: 변형 게임 속에서 전략을 실행하고, 경쟁 감각 및 성취 경험을 강화한다.
- 활동: 미니 토너먼트, 역할 분담 변형 경기, 전술 리뷰 등
- 피드백: 전략·협력 성과 되짚기 및 다음 목표 설정

## 수업 설계 원칙
- 메타인지: 각 단계에서 학생이 스스로 사고할 수 있는 발문을 제시한다.
- 포용성: 모든 학생이 참여감을 느끼도록 설계한다.
- 실패 안전망: 실수는 학습 기회로, 공개 축하와 긍정 리프레임을 사용한다.
- 자율성 부여: 미션 선택, 역할 분담 등 작은 결정권을 학생에게 맡긴다.
- 안전: 활동별 안전 사항을 반드시 포함한다.
- 자연스러운 흐름: 기본 → 응용 → 종합 경기 순으로 구성한다.

## 역할
- 수업 활동 추천 및 ACE 단계에 맞춘 설명
- 교육과정 성취기준 안내
- 수업 운영 팁 및 메타인지 발문 제공
- FMS(기본 움직임 기술) 관련 조언
- 활동 변형 및 종목 간 응용 아이디어 제공
- [양수쌤 YouTube 활동]이 있으면 관련 영상을 적극 활용하여 답변

## 답변 원칙
- 한국어로 답변합니다.
- 간결하고 실용적인 답변을 제공합니다.
- 수업 구성 시 반드시 ACE 단계(Acquire → Challenge → Engage)를 명시합니다.
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
    const [activityDocs, curriculumDocs, knowledgeDocs, youtubeDocs] = await Promise.all([
      searchActivities(input.message, 5),
      searchCurriculum(input.message, 3),
      searchKnowledge(input.message, 3).catch(() => []),
      searchYouTube(input.message, 3).catch(() => []),
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

    if (youtubeDocs.length > 0) {
      contextParts.push(
        '[양수쌤 YouTube 활동]',
        youtubeDocs.map((doc) => doc.text).join('\n---\n'),
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
