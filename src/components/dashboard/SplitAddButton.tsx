
'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface SplitAddButtonProps {
  onOpen: () => void;
}

export default function SplitAddButton({ onOpen }: SplitAddButtonProps) {
  return (
    <button
      onClick={onOpen}
      className="h-10 w-10 rounded-full overflow-hidden flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <div className="w-full h-1/2 bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors">
        <ArrowUpRight className="h-5 w-5 text-white" />
      </div>
      <div className="w-full h-1/2 bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
        <ArrowDownLeft className="h-5 w-5 text-white" />
      </div>
    </button>
  );
}
