'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface SplitAddButtonProps {
  onOpen: () => void;
}

export default function SplitAddButton({ onOpen }: SplitAddButtonProps) {
  return (
    <button
      onClick={onOpen}
      className="h-10 w-10 rounded-full relative overflow-hidden flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-transform hover:scale-110"
      style={{
        background: 'linear-gradient(135deg, #22c55e 50%, #ef4444 50%)',
      }}
    >
      <ArrowUpRight className="h-5 w-5 text-white absolute top-1 left-1" />
      <ArrowDownLeft className="h-5 w-5 text-white absolute bottom-1 right-1" />
    </button>
  );
}
