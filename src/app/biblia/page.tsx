
'use client';

import { text } from "@/lib/strings";
import { BookOpen } from "lucide-react";

export default function BibliaPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <BookOpen className="w-16 h-16 mb-4 text-primary" />
        <h1 className="text-2xl font-bold">{text.sidebar.bible}</h1>
        <p className="text-muted-foreground">{text.common.comingSoon}</p>
    </div>
  );
}
