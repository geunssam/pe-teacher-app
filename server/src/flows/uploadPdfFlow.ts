import { z } from 'genkit';
import { PDFParse } from 'pdf-parse';
import { ai } from '../genkit.js';
import { chunkText } from '../utils/textChunker.js';
import { indexKnowledgeChunks } from '../rag/indexer.js';
import type { KnowledgeChunk } from '../rag/dataLoader.js';

const UploadPdfInputSchema = z.object({
  title: z.string().describe('Document title'),
  base64: z.string().describe('Base64-encoded PDF file content'),
  docId: z.string().optional(),
});

const UploadPdfOutputSchema = z.object({
  docId: z.string(),
  title: z.string(),
  chunksCreated: z.number(),
  embedded: z.number(),
  extractedLength: z.number(),
  extractedText: z.string(),
});

export const uploadPdfFlow = ai.defineFlow(
  {
    name: 'uploadPdfFlow',
    inputSchema: UploadPdfInputSchema,
    outputSchema: UploadPdfOutputSchema,
  },
  async (input) => {
    const docId = input.docId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Decode base64 → Uint8Array
    const buffer = Buffer.from(input.base64, 'base64');

    // pdf-parse v2: pass data in LoadParameters, then call getText()
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    await parser.destroy();

    const text = textResult.text?.trim() ?? '';

    if (!text) {
      return {
        docId,
        title: input.title,
        chunksCreated: 0,
        embedded: 0,
        extractedLength: 0,
        extractedText: '',
      };
    }

    console.log(`[uploadPdf] "${input.title}" → ${text.length}자 추출 (${textResult.total}페이지)`);

    // Chunk and index
    const textChunks = chunkText(text, 500, 100);

    if (textChunks.length === 0) {
      return {
        docId,
        title: input.title,
        chunksCreated: 0,
        embedded: 0,
        extractedLength: text.length,
        extractedText: text.slice(0, 500_000),
      };
    }

    const chunks: KnowledgeChunk[] = textChunks.map((c, i) => ({
      id: `${docId}_chunk_${i}`,
      docId,
      title: input.title,
      content: c,
      chunkIndex: i,
      sourceType: 'pdf' as const,
    }));

    const result = await indexKnowledgeChunks(chunks);

    return {
      docId,
      title: input.title,
      chunksCreated: chunks.length,
      embedded: result.embedded,
      extractedLength: text.length,
      extractedText: text.slice(0, 500_000),
    };
  },
);
