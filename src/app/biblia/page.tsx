
'use client';

import { useState, useEffect } from 'react';
import { text } from '@/lib/strings';
import { type BibleBook, type Verse } from '@/lib/types';
import { bibleBooks } from '@/lib/bible';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

const versions = [
  { id: 'acf', name: 'Almeida Corrigida Fiel' },
  { id: 'nvi', name: 'Nova Versão Internacional' },
  { id: 'ra', name: 'Almeida Revista e Atualizada' },
];

export default function BibliaPage() {
  const [selectedVersion, setSelectedVersion] = useState('acf');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(
    bibleBooks[0]
  );
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChapter = async () => {
    if (!selectedBook || !selectedChapter || !selectedVersion) return;
    setIsLoading(true);
    setError(null);
    setVerses([]);

    try {
      const response = await fetch(
        `https://www.abibliadigital.com.br/api/verses/${selectedVersion}/${selectedBook.abbrev.pt}/${selectedChapter}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_BIBLE_API_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(text.bible.error);
      }
      const data = await response.json();
      setVerses(data.verses);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookChange = (abbrev: string) => {
    const book = bibleBooks.find((b) => b.abbrev.pt === abbrev) || null;
    setSelectedBook(book);
    setSelectedChapter(1); // Reset chapter to 1 when book changes
  };

  const chapterOptions = selectedBook
    ? Array.from({ length: selectedBook.chapters }, (_, i) => i + 1)
    : [];

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{text.bible.title}</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
            <Select
              value={selectedVersion}
              onValueChange={setSelectedVersion}
            >
              <SelectTrigger>
                <SelectValue placeholder={text.bible.selectVersion} />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedBook?.abbrev.pt || ''}
              onValueChange={handleBookChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={text.bible.selectBook} />
              </SelectTrigger>
              <SelectContent>
                {bibleBooks.map((book) => (
                  <SelectItem key={book.abbrev.pt} value={book.abbrev.pt}>
                    {book.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(selectedChapter)}
              onValueChange={(val) => setSelectedChapter(Number(val))}
              disabled={!selectedBook}
            >
              <SelectTrigger>
                <SelectValue placeholder={text.bible.selectChapter} />
              </SelectTrigger>
              <SelectContent>
                {chapterOptions.map((chapter) => (
                  <SelectItem key={chapter} value={String(chapter)}>
                    Capítulo {chapter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchChapter} className="w-full md:w-auto" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {text.bible.search}
          </Button>
        </CardContent>
      </Card>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            {error}
          </div>
        ) : verses.length > 0 ? (
          <ScrollArea className="h-full pr-4">
             <div className="prose prose-lg max-w-none">
              <h2 className="text-xl font-bold mb-4">
                  {selectedBook?.name} {selectedChapter}
              </h2>
              {verses.map((verse) => (
                <p key={verse.number} className="mb-2">
                  <span className="font-bold text-primary mr-2">
                    {verse.number}
                  </span>
                  {verse.text}
                </p>
              ))}
            </div>
          </ScrollArea>
        ) : (
           <div className="flex items-center justify-center h-full text-muted-foreground">
              Selecione um livro e capítulo para começar a ler.
            </div>
        )}
      </div>
    </div>
  );
}
