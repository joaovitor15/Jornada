'use server';
/**
 * @fileOverview Flow to interact with the abibliadigital.com.br API.
 *
 * - getBooks: Fetches all books from the Bible.
 * - getVerse: Fetches a specific chapter or verse.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { type BibleBook, type Verse } from '@/lib/types';

const BIBLE_API_URL = 'https://www.abibliadigital.com.br/api';
const BIBLE_API_TOKEN = process.env.BIBLE_API_TOKEN;
const BIBLE_VERSION = 'nvi';

const GetVerseInputSchema = z.object({
  book: z.string().describe('The abbreviation of the book (e.g., "gn").'),
  chapter: z.number().describe('The chapter number.'),
  verse: z.number().optional().describe('The verse number (optional).'),
});
type GetVerseInput = z.infer<typeof GetVerseInputSchema>;


// Helper function to make authenticated requests
async function fetchFromBibleAPI(endpoint: string) {
  if (!BIBLE_API_TOKEN) {
    throw new Error('BIBLE_API_TOKEN is not defined in environment variables.');
  }

  const response = await fetch(`${BIBLE_API_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${BIBLE_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Fetches all books of the Bible.
 * @returns A promise that resolves to an array of BibleBook objects.
 */
export async function getBooks(): Promise<BibleBook[]> {
  return getBooksFlow();
}

const getBooksFlow = ai.defineFlow(
  {
    name: 'getBooksFlow',
    outputSchema: z.array(z.any()),
  },
  async () => {
    return await fetchFromBibleAPI('/books');
  }
);


/**
 * Fetches verses from a specific chapter of a book.
 * @param input - An object containing the book abbreviation and chapter number.
 * @returns A promise that resolves to an array of Verse objects.
 */
export async function getVerse(input: GetVerseInput): Promise<Verse[]> {
  return getVerseFlow(input);
}

const getVerseFlow = ai.defineFlow(
  {
    name: 'getVerseFlow',
    inputSchema: GetVerseInputSchema,
    outputSchema: z.array(z.any()),
  },
  async (input) => {
    const endpoint = `/verses/${BIBLE_VERSION}/${input.book}/${input.chapter}`;
    const result = await fetchFromBibleAPI(endpoint);
    
    // The API returns an object with book, chapter, and verses properties.
    // We only need to return the verses array.
    return result.verses;
  }
);
