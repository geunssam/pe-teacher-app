import { z } from 'genkit';
import { ai } from '../genkit.js';
import { chunkText } from '../utils/textChunker.js';
import { indexKnowledgeChunks } from '../rag/indexer.js';
import type { KnowledgeChunk } from '../rag/dataLoader.js';

const IngestInputSchema = z.object({
  title: z.string().describe('Document title'),
  content: z.string().describe('Full text content'),
  sourceType: z.enum(['pdf', 'text']).default('text'),
  docId: z.string().optional().describe('Unique document ID (auto-generated if omitted)'),
});

const IngestOutputSchema = z.object({
  docId: z.string(),
  title: z.string(),
  chunksCreated: z.number(),
  embedded: z.number(),
});

export const ingestDocumentFlow = ai.defineFlow(
  {
    name: 'ingestDocumentFlow',
    inputSchema: IngestInputSchema,
    outputSchema: IngestOutputSchema,
  },
  async (input) => {
    const docId = input.docId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Chunk the text
    const textChunks = chunkText(input.content, 500, 100);

    if (textChunks.length === 0) {
      return {
        docId,
        title: input.title,
        chunksCreated: 0,
        embedded: 0,
      };
    }

    // Build KnowledgeChunk objects
    const chunks: KnowledgeChunk[] = textChunks.map((text, i) => ({
      id: `${docId}_chunk_${i}`,
      docId,
      title: input.title,
      content: text,
      chunkIndex: i,
      sourceType: input.sourceType,
    }));

    console.log(`[ingest] "${input.title}" → ${chunks.length} chunks, indexing...`);

    // Index via existing batch system
    const result = await indexKnowledgeChunks(chunks);

    console.log(`[ingest] "${input.title}" → ${result.embedded} chunks embedded`);

    return {
      docId,
      title: input.title,
      chunksCreated: chunks.length,
      embedded: result.embedded,
    };
  },
);
