'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getDocs,
  query,
  where,
  writeBatch,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  setDoc,
  getDoc,
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
import { useTags } from '@/hooks/use-tags';

export default function ManageTagsPageClient() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const { tags: activeTags, loading: tagsLoading, refreshTags } = useTags();

  const [archivedTags, setArchivedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');

  const fetchArchivedTags = useCallback(async () => {
    if (!user || !activeProfile) return;
    setLoading(true);
    try {
      const profileDocRef = doc(db, 'profiles', `${user.uid}_${activeProfile}`);
      const profileDoc = await getDoc(profileDocRef);
      
      let archived: string[] = [];
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        archived = profileData.archivedTags || [];
      }
      setArchivedTags(archived.sort());
    } catch (error) {
      console.error('Error fetching archived tags:', error);
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
    if (!tagsLoading) {
      fetchArchivedTags();
    }
  }, [tagsLoading, fetchArchivedTags]);

  const handleCreateTag = async () => {
    if (!user || !activeProfile || !newTag.trim()) return;

    const profileId = `${user.uid}_${activeProfile}`;
    const profileDocRef = doc(db, 'profiles', profileId);
    
    try {
      await setDoc(
        profileDocRef,
        {
          userId: user.uid,
          profile: activeProfile,
          id: profileId,
          tags: arrayUnion(newTag.trim()),
        },
        { merge: true }
      );

      toast({
        title: text.common.success,
        description: text.tags.createSuccess,
      });
      setNewTag('');
      refreshTags(); 
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

    const oldName = isRenaming;
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
          const updatedTags = [
            ...currentTags.filter((t: string) => t !== oldName),
            newName,
          ];
          batch.update(doc.ref, { tags: updatedTags });
        });
      }

      const profileDocRef = doc(db, 'profiles', `${user.uid}_${activeProfile}`);
      batch.update(profileDocRef, {
        tags: arrayRemove(oldName),
      });
      batch.update(profileDocRef, {
        tags: arrayUnion(newName),
      });

      await batch.commit();

      toast({
        title: text.common.success,
        description: text.tags.renameSuccess,
      });
    } catch (error) {
      console.error('Error renaming tag:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.tags.renameError,
      });
    } finally {
      setIsRenaming(null);
      setNewTagName('');
      refreshTags();
    }
  };

  const handleArchiveTag = async (tagName: string, archive = true) => {
    if (!user || !activeProfile) return;
    const profileDocRef = doc(db, 'profiles', `${user.uid}_${activeProfile}`);
    try {
      if (archive) {
        await updateDoc(profileDocRef, {
          archivedTags: arrayUnion(tagName),
          tags: arrayRemove(tagName),
        });
        toast({
          title: text.common.success,
          description: text.tags.archiveSuccess,
        });
      } else {
        await updateDoc(profileDocRef, {
          archivedTags: arrayRemove(tagName),
          tags: arrayUnion(tagName),
        });
        toast({
          title: text.common.success,
          description: text.tags.unarchiveSuccess,
        });
      }
      refreshTags(); // Refreshes active tags
      fetchArchivedTags(); // Refreshes archived tags
    } catch (error) {
      console.error('Error archiving/unarchiving tag:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.tags.archiveError,
      });
    }
  };

  const isLoading = loading || tagsLoading;

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
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTag();
              }}
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
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{text.tags.tagName}</TableHead>
                      <TableHead className="text-right">
                        {text.common.actions}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTags.map((tag) => (
                      <TableRow key={tag}>
                        <TableCell>
                          <Badge variant="secondary">{tag}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setIsRenaming(tag);
                              setNewTagName(tag);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleArchiveTag(tag, true)}
                          >
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
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{text.tags.tagName}</TableHead>
                      <TableHead className="text-right">
                        {text.common.actions}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedTags.map((tag) => (
                      <TableRow key={tag}>
                        <TableCell>
                          <Badge variant="outline">{tag}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleArchiveTag(tag, false)}
                          >
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

      <AlertDialog
        open={!!isRenaming}
        onOpenChange={(open) => !open && setIsRenaming(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.tags.renameTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {text.tags.renameDescription(isRenaming || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{text.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRenameTag}
              disabled={!newTagName.trim() || newTagName.trim() === isRenaming}
            >
              {text.tags.renameButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
