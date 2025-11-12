'use client';

import { cn } from '@/lib/utils';

export function AgafarmaLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="rounded-full border-4 border-primary p-2">
        <svg
          className="h-8 w-8 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </div>
      <span className="text-3xl font-bold text-primary">
        Agafarma Tuparendi
      </span>
    </div>
  );
}
