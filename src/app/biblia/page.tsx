
'use client';

import { useEffect, useState } from 'react';
import { text } from '@/lib/strings';
import { type BibleBook, type Verse } from '@/lib/types';
import { getBooks, getVerse } from '@/ai/flows/bible-flow';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, BookOpenCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function BibliaPage() {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [chapters, setChapters] = useState<number[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooks() {
      try {
        const fetchedBooks = await getBooks();
        setBooks(fetchedBooks);
      } catch (err) {
        console.error(err);
        setError(text.bible.error);
      } finally {
        setIsLoadingBooks(false);
      }
    }
    fetchBooks();
  }, []);

  useEffect(() => {
    if (selectedBook) {
      const book = books.find((b) => b.abbrev.pt === selectedBook);
      if (book) {
        setChapters(Array.from({ length: book.chapters }, (_, i) => i + 1));
        setSelectedChapter('');
        setVerses([]);
      }
    }
  }, [selectedBook, books]);

  const handleSearch = async () => {
    if (!selectedBook || !selectedChapter) return;
    setIsLoadingVerses(true);
    setError(null);
    setVerses([]);
    try {
      const result = await getVerse({
        book: selectedBook,
        chapter: Number(selectedChapter),
      });
      setVerses(result);
    } catch (err) {
      console.error(err);
      setError(text.bible.error);
    } finally {
      setIsLoadingVerses(false);
    }
  };

  const selectedBookName = books.find(b => b.abbrev.pt === selectedBook)?.name || '';

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{text.bible.title}</h1>
        <p className="text-muted-foreground">{text.bible.description}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label htmlFor="book-select">{text.bible.book}</label>
              <Select
                value={selectedBook}
                onValueChange={setSelectedBook}
                disabled={isLoadingBooks}
              >
                <SelectTrigger id="book-select">
                  <SelectValue placeholder={text.bible.selectBook} />
                </SelectTrigger>
                <SelectContent>
                  {books.map((book) => (
                    <SelectItem key={book.abbrev.pt} value={book.abbrev.pt}>
                      {book.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="chapter-select">{text.bible.chapter}</label>
              <Select
                value={selectedChapter}
                onValueChange={setSelectedChapter}
                disabled={!selectedBook}
              >
                <SelectTrigger id="chapter-select">
                  <SelectValue placeholder={text.bible.selectChapter} />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chap) => (
                    <SelectItem key={chap} value={String(chap)}>
                      {chap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSearch}
              disabled={!selectedBook || !selectedChapter || isLoadingVerses}
              className="w-full lg:w-auto"
            >
              {isLoadingVerses ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {text.bible.search}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-25rem)] pr-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>{text.common.error}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isLoadingVerses && (
               <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">{text.bible.loading}</p>
              </div>
            )}

            {!isLoadingVerses && verses.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4">{text.bible.chapterTitle(selectedBookName, Number(selectedChapter))}</h2>
                    <div className="space-y-4">
                        {verses.map((verse) => (
                            <p key={verse.number}>
                                <span className="font-bold text-primary mr-2">{verse.number}</span>
                                {verse.text}
                            </p>
                        ))}
                    </div>
                </div>
            )}

             {!isLoadingVerses && !error && verses.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <BookOpenCheck className="w-16 h-16 mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">{text.bible.description}</p>
                </div>
             )}

          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
