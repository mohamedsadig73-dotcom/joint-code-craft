import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Search, Filter, Plus, Download, Edit, Trash2, Eye, TrendingUp, BarChart3 } from 'lucide-react';
import { ComparisonBarChart } from '@/components/charts/ComparisonBarChart';
import { StatusPieChart } from '@/components/charts/StatusPieChart';

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

  // بيانات للرسوم البيانية
  const statusStats = [
    { name: t('unsigned') || 'غير موقعة', value: mockDeclarations.filter(d => d.status === 'unsigned').length, color: 'hsl(var(--unsigned))' },
    { name: t('pending') || 'قيد الانتظار', value: mockDeclarations.filter(d => d.status === 'pending').length, color: 'hsl(var(--pending))' },
    { name: t('approved') || 'موافق عليها', value: mockDeclarations.filter(d => d.status === 'approved').length, color: 'hsl(var(--approved))' },
    { name: t('archived') || 'مؤرشفة', value: mockDeclarations.filter(d => d.status === 'archived').length, color: 'hsl(var(--archived))' },
  ];

  const typeComparison = [
    { 
      category: 'Import', 
      approved: mockDeclarations.filter(d => d.type === 'Import' && d.status === 'approved').length,
      pending: mockDeclarations.filter(d => d.type === 'Import' && d.status === 'pending').length,
      unsigned: mockDeclarations.filter(d => d.type === 'Import' && d.status === 'unsigned').length,
    },
    { 
      category: 'Export', 
      approved: mockDeclarations.filter(d => d.type === 'Export' && d.status === 'approved').length,
      pending: mockDeclarations.filter(d => d.type === 'Export' && d.status === 'pending').length,
      unsigned: mockDeclarations.filter(d => d.type === 'Export' && d.status === 'unsigned').length,
    },
    { 
      category: 'Transit', 
      approved: mockDeclarations.filter(d => d.type === 'Transit' && d.status === 'approved').length,
      pending: mockDeclarations.filter(d => d.type === 'Transit' && d.status === 'pending').length,
      unsigned: mockDeclarations.filter(d => d.type === 'Transit' && d.status === 'unsigned').length,
    },
  ];

  const typeBars = [
    { dataKey: 'approved', fill: 'hsl(var(--approved))', name: 'موافق عليها' },
    { dataKey: 'pending', fill: 'hsl(var(--pending))', name: 'قيد الانتظار' },
    { dataKey: 'unsigned', fill: 'hsl(var(--unsigned))', name: 'غير موقعة' },
  ];

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
            { label: t('unsigned'), value: mockDeclarations.filter(d => d.status === 'unsigned').length, color: 'text-unsigned' },
            { label: t('pending'), value: mockDeclarations.filter(d => d.status === 'pending').length, color: 'text-pending' },
            { label: t('approved'), value: mockDeclarations.filter(d => d.status === 'approved').length, color: 'text-approved' },
            { label: t('archived'), value: mockDeclarations.filter(d => d.status === 'archived').length, color: 'text-archived' },
          ].map((stat) => (
            <Card key={stat.label} className="glass-card border-border/50 p-4 text-center hover:scale-105 transition-transform cursor-pointer">
              <div className={`text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Charts Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <StatusPieChart data={statusStats} />
          <ComparisonBarChart 
            data={typeComparison} 
            bars={typeBars}
            title="التصنيف حسب النوع والحالة"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-success" />
                معدل الموافقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success mb-2">
                {((mockDeclarations.filter(d => d.status === 'approved').length / mockDeclarations.length) * 100).toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">من إجمالي التصريحات</p>
              <div className="mt-4 w-full bg-muted/20 rounded-full h-2">
                <div 
                  className="bg-success h-2 rounded-full transition-all" 
                  style={{ width: `${(mockDeclarations.filter(d => d.status === 'approved').length / mockDeclarations.length) * 100}%` }} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-pending" />
                قيد المعالجة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-pending mb-2">
                {mockDeclarations.filter(d => d.status === 'pending' || d.status === 'unsigned').length}
              </div>
              <p className="text-sm text-muted-foreground">تحتاج إلى إجراء</p>
              <div className="mt-4 w-full bg-muted/20 rounded-full h-2">
                <div 
                  className="bg-pending h-2 rounded-full transition-all" 
                  style={{ width: `${((mockDeclarations.filter(d => d.status === 'pending' || d.status === 'unsigned').length / mockDeclarations.length) * 100)}%` }} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-archived" />
                المؤرشفة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-archived mb-2">
                {mockDeclarations.filter(d => d.status === 'archived').length}
              </div>
              <p className="text-sm text-muted-foreground">تصريحات مكتملة</p>
              <div className="mt-4 w-full bg-muted/20 rounded-full h-2">
                <div 
                  className="bg-archived h-2 rounded-full transition-all" 
                  style={{ width: `${(mockDeclarations.filter(d => d.status === 'archived').length / mockDeclarations.length) * 100}%` }} 
                />
              </div>
            </CardContent>
          </Card>
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
