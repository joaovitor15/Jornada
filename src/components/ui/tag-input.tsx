'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { X, Tag } from 'lucide-react';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandEmpty,
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
    setOpen(false); // Fecha o popover
    inputRef.current?.focus(); // Mantém o foco no input
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue) {
      handleRemoveTag(value[value.length - 1]);
    }
  };

  const filteredSuggestions = safeSuggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(suggestion)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-md border border-input p-2',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          onClick={() => inputRef.current?.focus()}
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
                  onClick={() => handleRemoveTag(tag)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </Badge>
          ))}
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 border-0 shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandList>
            {filteredSuggestions.length > 0 ? (
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
            ) : (
              <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}