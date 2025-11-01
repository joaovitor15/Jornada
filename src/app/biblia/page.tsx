
'use client';

import { useState, useEffect } from 'react';
import { text } from '@/lib/strings';
import { books } from '@/lib/bible'; // Usaremos o mesmo arquivo de livros da etapa anterior
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Interface para a nova API (abibliadigital.com.br)
interface Verse {
  number: number;
  text: string;
}

// Interface para a resposta da API
interface BibleApiResponse {
  book: {
    abbrev: { pt: string; en: string };
    name: string;
    author: string;
    group: string;
    version: string;
  };
  chapter: {
    number: number;
    verses: number;
  };
  verses: Verse[];
}

const versions = [
  { id: 'nvi', name: 'NVI' },
  { id: 'ara', name: 'Almeida Revista e Atualizada' },
  { id: 'acf', name: 'Almeida Corrigida Fiel' },
  { id: 'kjv', name: 'King James Version' },
];

export default function BibliaPage() {
  const [selectedVersion, setSelectedVersion] = useState(versions[0].id);
  const [selectedBook, setSelectedBook] = useState(books[0]);
  const [selectedChapter, setSelectedChapter] = useState('1');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChapter = async () => {
      if (!selectedBook || !selectedChapter || !selectedVersion) return;

      setLoading(true);
      setError(null);

      try {
        // Nova URL da API (abibliadigital.com.br)
        const response = await fetch(
          `https://www.abibliadigital.com.br/api/verses/${selectedVersion}/${selectedBook.abbrev}/${selectedChapter}`
        );

        if (!response.ok) {
          throw new Error(
            'Falha ao buscar o capítulo. Verifique a versão e o livro.'
          );
        }

        const data: BibleApiResponse | { msg: string } = await response.json();

        // A API retorna um { "msg": "..." } em caso de erro
        if ('msg' in data) {
          throw new Error(data.msg);
        }

        setVerses(data.verses);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.'
        );
        setVerses([]); // Limpa os versículos antigos em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchChapter();
  }, [selectedBook, selectedChapter, selectedVersion]);

  const handleBookChange = (abbrev: string) => {
    const book = books.find((b) => b.abbrev === abbrev);
    if (book) {
      setSelectedBook(book);
      setSelectedChapter('1'); // Reseta o capítulo para 1 ao trocar de livro
    }
  };

  const chapterOptions = Array.from(
    { length: selectedBook.chapters },
    (_, i) => i + 1
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{text.sidebar.bible}</h1>
        <div className="flex flex-wrap gap-2">
          {/* Seletor de Versão */}
          <Select
            value={selectedVersion}
            onValueChange={setSelectedVersion}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Versão" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Seletor de Livro */}
          <Select
            value={selectedBook.abbrev}
            onValueChange={handleBookChange}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Livro" />
            </SelectTrigger>
            <SelectContent>
              {books.map((book) => (
                <SelectItem key={book.abbrev} value={book.abbrev}>
                  {book.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Seletor de Capítulo */}
          <Select
            value={selectedChapter}
            onValueChange={setSelectedChapter}
          >
            <SelectTrigger className="w-full sm:w-[100px]">
              <SelectValue placeholder="Capítulo" />
            </SelectTrigger>
            <SelectContent>
              {chapterOptions.map((chapter) => (
                <SelectItem key={chapter} value={String(chapter)}>
                  {chapter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>
            {selectedBook.name} {selectedChapter} (
            {versions.find((v) => v.id === selectedVersion)?.name})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex">
          {loading ? (
            <div className="flex justify-center items-center h-40 w-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-destructive text-center w-full">{error}</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)] w-full">
              <div className="space-y-2" style={{ lineHeight: '1.8' }}>
                {verses.map((verse) => (
                  <p key={verse.number}>
                    <span className="font-bold text-sm pr-2 align-super">
                      {verse.number}
                    </span>
                    {verse.text}
                  </p>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
