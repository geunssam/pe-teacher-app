import { z } from 'genkit';
import { ai } from '../genkit.js';
import { indexYouTubeVideos } from '../rag/indexer.js';
import type { YouTubeVideo } from '../rag/dataLoader.js';

const IngestYouTubeInputSchema = z.object({
  videos: z.array(z.any()).describe('Array of structured YouTube video objects'),
});

const IngestYouTubeOutputSchema = z.object({
  total: z.number(),
  peActivities: z.number(),
  embedded: z.number(),
});

export const ingestYouTubeFlow = ai.defineFlow(
  {
    name: 'ingestYouTubeFlow',
    inputSchema: IngestYouTubeInputSchema,
    outputSchema: IngestYouTubeOutputSchema,
  },
  async (input) => {
    const videos = input.videos as YouTubeVideo[];
    const peVideos = videos.filter((v) => v.is_pe_activity && v.activity);

    console.log(`[ingestYouTube] Received ${videos.length} videos, ${peVideos.length} are PE activities`);

    const result = await indexYouTubeVideos(videos);

    console.log(`[ingestYouTube] Indexed ${result.embedded} YouTube activity documents`);

    return {
      total: videos.length,
      peActivities: peVideos.length,
      embedded: result.embedded,
    };
  },
);
