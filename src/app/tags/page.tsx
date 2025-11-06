'use client';

import ManageTagsPageClient from '@/components/tags/manage-tags-page';
import { text } from '@/lib/strings';

export default function TagsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full flex flex-col">
       <div className="mb-4">
        <h1 className="text-2xl font-bold">{text.sidebar.manageTags}</h1>
        <p className="text-muted-foreground">{text.tags.description}</p>
      </div>
      <div className="flex-grow">
        <ManageTagsPageClient />
      </div>
    </div>
  );
}
