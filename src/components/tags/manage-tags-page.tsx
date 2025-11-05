'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collectionGroup,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { text } from '@/lib/strings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface TagInfo {
  name: string;
  count: number;
}

export default function ManageTagsPageClient() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();

  const [tags, setTags] = useState<TagInfo[]>([]);
  const [archivedTags, setArchivedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [isRenaming, setIsRenaming] = useState<TagInfo | null>(null);
  const [newTagName, setNewTagName] = useState('');

  const fetchTags = useCallback(async () => {
    if (!user || !activeProfile) return;
    setLoading(true);

    const tagCounts: { [key: string]: number } = {};
    const collectionsToSearch = ['expenses', 'incomes', 'plans'];

    try {
      for (const col of collectionsToSearch) {
        const q = query(
          collection(db, col),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.tags && Array.isArray(data.tags)) {
            data.tags.forEach((tag: string) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }
        });
      }

      const profileDocRef = doc(db, 'profiles', `${user.uid}_${activeProfile}`);
      const profileDoc = await getDocs(
        query(collection(db, 'profiles'), where('id', '==', `${user.uid}_${activeProfile}`))
      );
      let preDefinedTags: string[] = [];
      let archived: string[] = [];
      if (!profileDoc.empty) {
        const profileData = profileDoc.docs[0].data();
        preDefinedTags = profileData.tags || [];
        archived = profileData.archivedTags || [];
      }

      preDefinedTags.forEach((tag) => {
        if (!tagCounts[tag]) {
          tagCounts[tag] = 0;
        }
      });

      const allTags = Object.entries(tagCounts).map(([name, count]) => ({
        name,
        count,
      }));

      setTags(allTags.filter((t) => !archived.includes(t.name)));
      setArchivedTags(archived);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.tags.fetchError,
      });
    } finally {
      setLoading(false);
    }
  }, [user, activeProfile, toast]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreateTag = async () => {
    if (!user || !activeProfile || !newTag.trim()) return;

    const profileDocRef = doc(db, 'profiles', `${user.uid}_${activeProfile}`);
    try {
      // Check if doc exists, if not, create it
      const profileDoc = await getDocs(query(collection(db, 'profiles'), where('id', '==', `${user.uid}_${activeProfile}`)));
      if (profileDoc.empty) {
        await updateDoc(profileDocRef, { id: `${user.uid}_${activeProfile}`, tags: [newTag.trim()] }, { merge: true });
      } else {
        await updateDoc(profileDocRef, { tags: arrayUnion(newTag.trim()) });
      }

      toast({
        title: text.common.success,
        description: text.tags.createSuccess,
      });
      setNewTag('');
      fetchTags();
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.tags.createError,
      });
    }
  };

  const handleRenameTag = async () => {
    if (!isRenaming || !newTagName.trim() || !user || !activeProfile) return;

    const oldName = isRenaming.name;
    const newName = newTagName.trim();
    setLoading(true);

    try {
      const batch = writeBatch(db);
      const collectionsToSearch = ['expenses', 'incomes', 'plans'];

      for (const col of collectionsToSearch) {
        const q = query(
          collection(db, col),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile),
          where('tags', 'array-contains', oldName)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
          const currentTags = doc.data().tags || [];
          const updatedTags = [...currentTags.filter((t: string) => t !== oldName), newName];
          batch.update(doc.ref, { tags: updatedTags });
        });
      }
      
      await batch.commit();

      // Also update in pre-defined tags if it exists
      const profileDocRef = doc(db, 'profiles', `${user.uid}_${activeProfile}`);
      await updateDoc(profileDocRef, { tags: arrayRemove(oldName) });
      await updateDoc(profileDocRef, { tags: arrayUnion(newName) });

      toast({ title: text.common.success, description: text.tags.renameSuccess });
    } catch (error) {
      console.error("Error renaming tag:", error);
      toast({ variant: 'destructive', title: text.common.error, description: text.tags.renameError });
    } finally {
      setIsRenaming(null);
      setNewTagName('');
      fetchTags();
    }
  };

  const handleArchiveTag = async (tagName: string, archive = true) => {
    if (!user || !activeProfile) return;
    const profileDocRef = doc(db, 'profiles', `${user.uid}_${activeProfile}`);
    try {
      if (archive) {
        await updateDoc(profileDocRef, { archivedTags: arrayUnion(tagName) });
        toast({ title: text.common.success, description: text.tags.archiveSuccess });
      } else {
        await updateDoc(profileDocRef, { archivedTags: arrayRemove(tagName) });
        toast({ title: text.common.success, description: text.tags.unarchiveSuccess });
      }
      fetchTags();
    } catch (error) {
      console.error('Error archiving tag:', error);
      toast({ variant: 'destructive', title: text.common.error, description: text.tags.archiveError });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{text.tags.createTitle}</CardTitle>
          <CardDescription>{text.tags.createDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder={text.tags.newTagPlaceholder}
            />
            <Button onClick={handleCreateTag} disabled={!newTag.trim()}>
              {text.tags.createButton}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="active">
        <TabsList>
            <TabsTrigger value="active">{text.tags.activeTags}</TabsTrigger>
            <TabsTrigger value="archived">{text.tags.archivedTags}</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
             <Card>
                <CardHeader>
                  <CardTitle>{text.tags.activeTags}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{text.tags.tagName}</TableHead>
                          <TableHead className="text-center">{text.tags.usageCount}</TableHead>
                          <TableHead className="text-right">{text.common.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tags.map((tag) => (
                          <TableRow key={tag.name}>
                            <TableCell><Badge variant="secondary">{tag.name}</Badge></TableCell>
                            <TableCell className="text-center">{tag.count}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => { setIsRenaming(tag); setNewTagName(tag.name); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleArchiveTag(tag.name, true)}>
                                <Archive className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
        </TabsContent>

        <TabsContent value="archived">
            <Card>
              <CardHeader>
                <CardTitle>{text.tags.archivedTags}</CardTitle>
              </CardHeader>
              <CardContent>
                 {loading ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{text.tags.tagName}</TableHead>
                          <TableHead className="text-right">{text.common.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedTags.map((tag) => (
                          <TableRow key={tag}>
                            <TableCell><Badge variant="outline">{tag}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleArchiveTag(tag, false)}>
                                <ArchiveRestore className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>


      <AlertDialog open={!!isRenaming} onOpenChange={(open) => !open && setIsRenaming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.tags.renameTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {text.tags.renameDescription(isRenaming?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{text.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameTag} disabled={!newTagName.trim() || newTagName.trim() === isRenaming?.name}>
              {text.tags.renameButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
