'use client';

import ManageTagsPageClient from '@/components/tags/manage-tags-page';
import { text } from '@/lib/strings';

export default function TagsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full">
      <ManageTagsPageClient />
    </div>
  );
}
