
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

  const handleAddTag = (tag: string) => {
    const newTag = tag.trim();
    if (newTag && !value.includes(newTag)) {
      onChange([...value, newTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
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

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      setShowSuggestions(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-md border border-input p-2",
          disabled && "cursor-not-allowed opacity-50"
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
                onClick={() => handleRemoveTag(tag)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </Badge>
        ))}
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 border-0 shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent"
        />
      </div>
      {showSuggestions && inputValue && (
        <Command className="absolute top-full mt-1 w-full z-10 rounded-md border bg-popover text-popover-foreground shadow-md">
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
      )}
    </div>
  );
}
