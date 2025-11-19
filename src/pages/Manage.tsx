import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { CreateDeclarationDialog } from '@/components/CreateDeclarationDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, Download, Edit, Trash2, Eye, Plus } from 'lucide-react';

interface Declaration {
  id: string;
  type: 'Import' | 'Export' | 'Transit';
  sender_id: string;
  sender?: { username: string };
  status: 'unsigned' | 'pending' | 'approved' | 'archived';
  created_at: string;
}

const statusColors = {
  unsigned: 'bg-unsigned/20 text-unsigned border-unsigned/30',
  pending: 'bg-pending/20 text-pending border-pending/30',
  approved: 'bg-approved/20 text-approved border-approved/30',
  archived: 'bg-archived/20 text-archived border-archived/30',
};

export default function Manage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    unsigned: 0,
    pending: 0,
    approved: 0,
    archived: 0,
  });

  useEffect(() => {
    loadDeclarations();
  }, []);

  const loadDeclarations = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeclarations(data || []);
      
      // Calculate stats
      const newStats = {
        unsigned: data?.filter(d => d.status === 'unsigned').length || 0,
        pending: data?.filter(d => d.status === 'pending').length || 0,
        approved: data?.filter(d => d.status === 'approved').length || 0,
        archived: data?.filter(d => d.status === 'archived').length || 0,
      };
      setStats(newStats);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('declarations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'Declaration deleted successfully',
      });
      loadDeclarations();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'unsigned' | 'pending' | 'approved' | 'archived') => {
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'Status updated successfully',
      });
      loadDeclarations();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredDeclarations = declarations.filter(dec => {
    const matchesSearch = dec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dec.sender?.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || dec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredDeclarations.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredDeclarations.map(d => d.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('declarations')}</h1>
          <p className="text-muted-foreground">
            {t('showing')} {filteredDeclarations.length} {t('of')} {declarations.length} {t('results')}
          </p>
        </div>

        {/* Filters and Actions */}
        <Card className="glass-card border-border/50 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`${t('search')}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass-card border-border/50"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 glass-card border-border/50">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="unsigned">{t('unsigned')}</SelectItem>
                <SelectItem value="pending">{t('pending')}</SelectItem>
                <SelectItem value="approved">{t('approved')}</SelectItem>
                <SelectItem value="archived">{t('archived')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <CreateDeclarationDialog 
                onSuccess={loadDeclarations}
              />
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {t('export')}
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-secondary/10 rounded-lg">
              <span className="text-sm font-medium">
                {selectedItems.length} {t('selected')}
              </span>
              <Button size="sm" variant="outline">{t('bulkActions')}</Button>
            </div>
          )}
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: t('unsigned'), value: stats.unsigned, color: 'text-unsigned' },
            { label: t('pending'), value: stats.pending, color: 'text-pending' },
            { label: t('approved'), value: stats.approved, color: 'text-approved' },
            { label: t('archived'), value: stats.archived, color: 'text-archived' },
          ].map((stat) => (
            <Card key={stat.label} className="glass-card border-border/50 p-4 text-center">
              <div className={`text-2xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Declarations Table */}
        <Card className="glass-card border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === filteredDeclarations.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>{t('declarationId')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('sender')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('createdDate')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {t('loading')}...
                  </TableCell>
                </TableRow>
              ) : filteredDeclarations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No declarations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeclarations.map((declaration) => (
                  <TableRow key={declaration.id} className="hover:bg-muted/5">
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(declaration.id)}
                        onCheckedChange={() => toggleSelectItem(declaration.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{declaration.id}</TableCell>
                    <TableCell>{declaration.type}</TableCell>
                    <TableCell>{declaration.sender?.username || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[declaration.status as keyof typeof statusColors]}>
                        {t(declaration.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(declaration.created_at).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/declaration/${declaration.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            const newStatus = declaration.status === 'unsigned' ? 'pending' : 
                                            declaration.status === 'pending' ? 'approved' : 'archived';
                            handleStatusUpdate(declaration.id, newStatus);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user?.role === 'admin' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => handleDelete(declaration.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
