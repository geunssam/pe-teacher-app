import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { devLocalVectorstore } from '@genkit-ai/dev-local-vectorstore';

const embedder = 'googleai/gemini-embedding-001';

export const ai = genkit({
  plugins: [
    googleAI(),
    devLocalVectorstore([
      {
        indexName: 'pe_activities',
        embedder,
      },
      {
        indexName: 'pe_curriculum',
        embedder,
      },
      {
        indexName: 'pe_records',
        embedder,
      },
      {
        indexName: 'pe_knowledge',
        embedder,
      },
    ]),
  ],
  model: 'googleai/gemini-2.5-flash',
});
