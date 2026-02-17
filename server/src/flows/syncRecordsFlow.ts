import { z } from 'genkit';
import { ai } from '../genkit.js';
import { indexRecords } from '../rag/indexer.js';
import type { ClassRecord } from '../rag/dataLoader.js';

const SyncInputSchema = z.object({
  records: z.array(
    z.object({
      id: z.string(),
      classDate: z.string(),
      className: z.string().optional(),
      activity: z.string(),
      domain: z.string().optional(),
      sequence: z.number().optional(),
      performance: z.string().optional(),
      memo: z.string().optional(),
      classId: z.string().optional(),
    }),
  ),
});

const SyncOutputSchema = z.object({
  embedded: z.number(),
  totalRecords: z.number(),
});

export const syncRecordsFlow = ai.defineFlow(
  {
    name: 'syncRecordsFlow',
    inputSchema: SyncInputSchema,
    outputSchema: SyncOutputSchema,
  },
  async (input) => {
    const records: ClassRecord[] = input.records;
    const result = await indexRecords(records);

    return {
      embedded: result.embedded,
      totalRecords: records.length,
    };
  },
);
