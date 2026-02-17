/**
 * Split text into overlapping chunks for vector indexing.
 *
 * @param text      - Full text to chunk
 * @param chunkSize - Target characters per chunk (default 500)
 * @param overlap   - Overlap characters between chunks (default 100)
 * @returns Array of chunk strings
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 100,
): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundary (. ! ? newline)
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end);
      const lastBreak = Math.max(
        slice.lastIndexOf('.'),
        slice.lastIndexOf('!'),
        slice.lastIndexOf('?'),
        slice.lastIndexOf('\n'),
      );
      if (lastBreak > chunkSize * 0.3) {
        end = start + lastBreak + 1;
      }
    }

    chunks.push(cleaned.slice(start, end).trim());
    start = end - overlap;

    // Prevent infinite loop for very small overlap
    if (start >= cleaned.length) break;
    if (end >= cleaned.length) {
      // Last chunk
      const last = cleaned.slice(start).trim();
      if (last && last !== chunks[chunks.length - 1]) {
        chunks.push(last);
      }
      break;
    }
  }

  return chunks.filter((c) => c.length > 0);
}
