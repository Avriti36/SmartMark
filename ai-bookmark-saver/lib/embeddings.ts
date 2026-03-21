import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions

/**
 * Generate a 1536-dimension embedding vector for the given text.
 * Use the same model for both indexing and querying — never mix models.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Build the text that gets embedded for a bookmark.
 * The searchable_context field is especially important for semantic richness.
 */
export function buildEmbeddingText(
  title: string,
  summary: string,
  searchableContext: string
): string {
  return `${title}. ${summary} ${searchableContext}`;
}
