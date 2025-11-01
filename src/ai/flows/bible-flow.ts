'use server';
/**
 * @fileOverview Flow to interact with the abibliadigital.com.br API.
 *
 * - getBooks: Fetches all books from the Bible.
 * - getVerse: Fetches a specific chapter or verse.
 */

import { type BibleBook, type Verse } from '@/lib/types';

const BIBLE_API_URL = 'https://www.abibliadigital.com.br/api';
const BIBLE_VERSION = 'nvi';

interface GetVerseInput {
  book: string;
  chapter: number;
}

// Helper function to make requests
async function fetchFromBibleAPI(endpoint: string) {
  const response = await fetch(`${BIBLE_API_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed with status ${response.status}: ${await response.text()}`
    );
  }

  return response.json();
}

/**
 * Fetches all books of the Bible.
 * @returns A promise that resolves to an array of BibleBook objects.
 */
export async function getBooks(): Promise<BibleBook[]> {
  return await fetchFromBibleAPI('/books');
}

/**
 * Fetches verses from a specific chapter of a book.
 * @param input - An object containing the book abbreviation and chapter number.
 * @returns A promise that resolves to an array of Verse objects.
 */
export async function getVerse(input: GetVerseInput): Promise<Verse[]> {
  const endpoint = `/verses/${BIBLE_VERSION}/${input.book}/${input.chapter}`;
  const result = await fetchFromBibleAPI(endpoint);

  // The API returns an object with book, chapter, and verses properties.
  // We only need to return the verses array.
  return result.verses;
}
