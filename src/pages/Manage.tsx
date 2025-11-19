import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
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
import { Search, Filter, Plus, Download, Edit, Trash2, Eye } from 'lucide-react';

const mockDeclarations = [
  { id: 'DEC-2024-001', type: 'Import', sender: 'Ali Hassan', status: 'approved', date: '2024-01-15' },
  { id: 'DEC-2024-002', type: 'Export', sender: 'Sara Ahmed', status: 'pending', date: '2024-01-16' },
  { id: 'DEC-2024-003', type: 'Import', sender: 'Omar Khalil', status: 'unsigned', date: '2024-01-17' },
  { id: 'DEC-2024-004', type: 'Transit', sender: 'Fatima Ali', status: 'approved', date: '2024-01-18' },
  { id: 'DEC-2024-005', type: 'Export', sender: 'Ahmed Nour', status: 'archived', date: '2024-01-19' },
  { id: 'DEC-2024-006', type: 'Import', sender: 'Layla Karim', status: 'pending', date: '2024-01-20' },
  { id: 'DEC-2024-007', type: 'Transit', sender: 'Youssef Zaki', status: 'approved', date: '2024-01-21' },
  { id: 'DEC-2024-008', type: 'Export', sender: 'Nadia Fathi', status: 'unsigned', date: '2024-01-22' },
];

const statusColors = {
  unsigned: 'bg-unsigned/20 text-unsigned border-unsigned/30',
  pending: 'bg-pending/20 text-pending border-pending/30',
  approved: 'bg-approved/20 text-approved border-approved/30',
  archived: 'bg-archived/20 text-archived border-archived/30',
};

export default function Manage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const filteredDeclarations = mockDeclarations.filter(dec => {
    const matchesSearch = dec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dec.sender.toLowerCase().includes(searchQuery.toLowerCase());
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
            {t('showing')} {filteredDeclarations.length} {t('of')} {mockDeclarations.length} {t('results')}
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
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2">
                <Plus className="w-4 h-4" />
                Add
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
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
            { label: t('unsigned'), value: 24, color: 'text-unsigned' },
            { label: t('pending'), value: 18, color: 'text-pending' },
            { label: t('approved'), value: 156, color: 'text-approved' },
            { label: t('archived'), value: 892, color: 'text-archived' },
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
              {filteredDeclarations.map((declaration) => (
                <TableRow key={declaration.id} className="hover:bg-muted/5">
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(declaration.id)}
                      onCheckedChange={() => toggleSelectItem(declaration.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{declaration.id}</TableCell>
                  <TableCell>{declaration.type}</TableCell>
                  <TableCell>{declaration.sender}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[declaration.status as keyof typeof statusColors]}>
                      {t(declaration.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{declaration.date}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
