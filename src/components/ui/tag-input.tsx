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
    const newTag = tag.trim().replace(/,/g, ''); // Remove vírgulas
    if (newTag && !value.includes(newTag)) {
      onChange([...value, newTag]);
    }
    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue) {
        handleAddTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue) {
      e.preventDefault();
      handleRemoveTag(value[value.length - 1]);
    }
  };

  const filteredSuggestions = safeSuggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(suggestion)
  );

  const hasContent = filteredSuggestions.length > 0 || inputValue.trim().length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Este é o "gatilho" que parece um input, mas apenas mostra as tags */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-text'
          )}
          onClick={() => !disabled && setOpen(true)}
        >
          <Tag className="h-4 w-4 text-muted-foreground mr-1" />
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
                  disabled={disabled}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </Badge>
          ))}
          {/* Mostra o placeholder se não houver tags e o input não estiver visível */}
          {value.length === 0 && (
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
          <CommandInput
            ref={inputRef}
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <CommandList>
            {hasContent ? (
              <>
                <CommandEmpty>
                  {inputValue.trim() ? (
                    <CommandItem
                      onSelect={() => handleAddTag(inputValue)}
                      className="cursor-pointer"
                      onMouseDown={(e) => e.preventDefault()}
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
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {suggestion}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
