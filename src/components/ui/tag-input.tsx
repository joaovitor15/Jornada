'use client';

import React, { useState, useRef } from 'react';
import { X, Tag } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export default function TagInput({
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Adicionar tags...',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

  const handleAddTag = (tag: string) => {
    const newTag = tag.trim();
    if (newTag && !value.includes(newTag)) {
      onChange([...value, newTag]);
    }
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  // --- INÍCIO DA CORREÇÃO ---
  // A lógica do 'Enter' foi removida daqui.
  // Agora, o 'cmdk' (Command) vai gerenciar a tecla "Enter"
  // e chamar o 'onSelect' do item correto (seja uma sugestão ou "Criar nova tag").
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // A vírgula ainda pode criar uma tag
    if (e.key === ',' && inputValue) {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue) {
      // O Backspace continua deletando a tag anterior
      e.preventDefault();
      handleRemoveTag(value[value.length - 1]);
    }
  };
  // --- FIM DA CORREÇÃO ---

  const filteredSuggestions = safeSuggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(suggestion)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Este é o "gatilho" que parece um input, mas apenas mostra as tags */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-md border border-input p-2 min-h-10',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <Tag className="h-4 w-4 text-muted-foreground" />
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={(e) => {
                    e.stopPropagation(); // Impede que o clique abra/feche o popover
                    handleRemoveTag(tag);
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </Badge>
          ))}
          {/* Mostra o placeholder se não houver tags e nada digitado */}
          {value.length === 0 && !inputValue && (
            <span className="text-sm text-muted-foreground ml-1">
              {placeholder}
            </span>
          )}
        </div>
      </PopoverTrigger>
      
      {/* Este é o conteúdo flutuante que contém o input real e as sugestões */}
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus(); // Foca o input dentro do popover
        }}
      >
        <Command>
          {/* Este é o input real para digitar */}
          <CommandInput
            ref={inputRef}
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>
              {/* Permite criar uma nova tag ao pressionar Enter */}
              {inputValue.trim() ? (
                <CommandItem
                  onSelect={() => handleAddTag(inputValue)}
                  className="cursor-pointer"
                >
                  Criar nova tag: "{inputValue}"
                </CommandItem>
              ) : (
                'Nenhuma tag encontrada.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  onSelect={() => handleAddTag(suggestion)}
                  className="cursor-pointer"
                >
                  {suggestion}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}