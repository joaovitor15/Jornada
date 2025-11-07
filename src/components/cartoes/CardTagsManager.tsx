
'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Loader2, CreditCard, Tag, ChevronRight } from 'lucide-react';
import { useTags } from '@/hooks/use-tags';
import { HierarchicalTag } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card as UICard, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '../ui/badge';

export default function CardTagsManager() {
  const { hierarchicalTags, loading } = useTags();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const cardPrincipalTag = useMemo((): HierarchicalTag | undefined => {
    return hierarchicalTags.find((tag) => tag.name === 'Cartões');
  }, [hierarchicalTags]);

  const handleSelectTag = (tagId: string) => {
    setSelectedTagId((prevId) => (prevId === tagId ? null : tagId));
  };
  
  // Seleciona a tag "Cartões" por padrão se ela existir
  useState(() => {
    if (cardPrincipalTag && !selectedTagId) {
        handleSelectTag(cardPrincipalTag.id);
    }
  });


  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      {/* Coluna de Tag Principal */}
      <div className="md:col-span-1 space-y-3 overflow-y-auto">
        {cardPrincipalTag ? (
          <div
            onClick={() => handleSelectTag(cardPrincipalTag.id)}
            className={cn(
              'p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center group',
              selectedTagId === cardPrincipalTag.id
                ? 'bg-primary/10 ring-2 ring-primary'
                : 'hover:bg-muted/50'
            )}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground"/>
              <span className="font-semibold">{cardPrincipalTag.name}</span>
              {cardPrincipalTag.children.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0.5 text-xs rounded-full">
                  {cardPrincipalTag.children.length}
                </Badge>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg text-center text-muted-foreground p-4">
            <p className="font-semibold">Nenhuma tag de cartão encontrada.</p>
            <p className="text-sm">Crie um cartão para gerar as tags automaticamente.</p>
          </div>
        )}
      </div>

      {/* Coluna de Tags Vinculadas */}
      <div className="md:col-span-2 overflow-y-auto pr-2">
        {selectedTagId && cardPrincipalTag && cardPrincipalTag.id === selectedTagId ? (
          <div className="space-y-4">
            {cardPrincipalTag.children.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardPrincipalTag.children.map((child) => (
                  <UICard key={child.id} className="shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground"/>
                          <CardTitle className="text-base font-medium">{child.name}</CardTitle>
                      </div>
                    </CardHeader>
                  </UICard>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-4 text-center">
                Nenhum cartão cadastrado. As tags vinculadas aparecerão aqui quando você criar um cartão.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg text-center text-muted-foreground p-4">
            <p>Selecione a tag "Cartões" à esquerda para ver os cartões cadastrados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
