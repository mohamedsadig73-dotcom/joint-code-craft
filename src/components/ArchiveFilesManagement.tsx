import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Plus, Trash2, FileText } from 'lucide-react';
import { toGregorianDateTime, sortArchiveNumbers } from '@/utils/dateUtils';

interface ArchiveFile {
  id: string;
  archive_number: string;
  description: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  declaration_count?: number;
}

export function ArchiveFilesManagement() {
  const { t } = useLanguage();
  const [archiveFiles, setArchiveFiles] = useState<ArchiveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [archiveNumber, setArchiveNumber] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadArchiveFiles();
  }, []);

  const loadArchiveFiles = async () => {
    try {
      setLoading(true);
      
      // جلب ملفات الأرشيف
      const { data: files, error } = await supabase
        .from('archive_files')
        .select('*');

      if (error) throw error;

      // حساب عدد الإقرارات لكل ملف
      const filesWithCount = await Promise.all(
        (files || []).map(async (file) => {
          const { count } = await supabase
            .from('declarations')
            .select('*', { count: 'exact', head: true })
            .eq('archive_file_id', file.id);
          
          return { ...file, declaration_count: count || 0 };
        })
      );

      // ترتيب الملفات رقمياً (S1, S2, ... S10)
      const sortedFiles = sortArchiveNumbers(filesWithCount);
      setArchiveFiles(sortedFiles);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('loading') + ' ' + t('archiveFiles'),
      });
      console.error('Error loading archive files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArchiveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!archiveNumber.trim()) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('enterArchiveNumber'),
      });
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('archive_files')
        .insert({
          archive_number: archiveNumber.trim(),
          description: description.trim() || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('archiveFileAdded'),
      });

      setIsDialogOpen(false);
      setArchiveNumber('');
      setDescription('');
      loadArchiveFiles();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message || t('archiveFileExists'),
      });
      console.error('Error creating archive file:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArchiveFile = async (id: string, archiveNum: string) => {
    if (!confirm(t('confirmDeleteArchive'))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('archive_files')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('archiveFileDeleted'),
      });

      loadArchiveFiles();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('cannotDeleteArchive'),
      });
      console.error('Error deleting archive file:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              {t('archiveFiles')}
            </CardTitle>
            <CardDescription>
              {t('archiveFilesManagement')}
            </CardDescription>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t('addArchiveFile')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('addArchiveFile')}</DialogTitle>
                <DialogDescription>
                  {t('enterArchiveNumber')}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateArchiveFile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="archive_number">{t('archiveNumber')} *</Label>
                  <Input
                    id="archive_number"
                    value={archiveNumber}
                    onChange={(e) => setArchiveNumber(e.target.value)}
                    placeholder="S1, S2, ..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('archiveDescription')}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('enterDescription')}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={submitting}
                  >
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t('adding') : t('add')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('loading')}
          </div>
        ) : archiveFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('noArchiveFiles')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('archiveNumber')}</TableHead>
                <TableHead>{t('archiveDescription')}</TableHead>
                <TableHead>{t('declarationsCount')}</TableHead>
                <TableHead>{t('createdAt')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archiveFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-mono font-semibold">
                    {file.archive_number}
                  </TableCell>
                  <TableCell className="max-w-md">
                    {file.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {file.declaration_count}
                    </div>
                  </TableCell>
                  <TableCell>
                    {toGregorianDateTime(file.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteArchiveFile(file.id, file.archive_number)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}