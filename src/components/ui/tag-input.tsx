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
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' && inputValue) {
      e.preventDefault();
      handleAddTag(inputValue);
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Command
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            inputRef.current?.blur();
          }
        }}
        className="overflow-visible bg-transparent"
      >
        <div
          className={cn(
            'group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <div className="flex flex-wrap gap-1">
            {value.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={() => handleRemoveTag(tag)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))}
            <CommandInput
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleKeyDown}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              placeholder={placeholder}
              disabled={disabled}
              className="ml-2 flex-1 bg-transparent p-0 outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="relative mt-2">
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {open && (filteredSuggestions.length > 0 || inputValue.trim()) && (
              <CommandList>
                <CommandEmpty>
                  {inputValue.trim() && (
                    <CommandItem
                      onSelect={() => handleAddTag(inputValue)}
                      className="cursor-pointer"
                    >
                      Criar nova tag: "{inputValue}"
                    </CommandItem>
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
            )}
          </PopoverContent>
        </div>
      </Command>
    </Popover>
  );
}