import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { Navigation } from '@/components/Navigation';
import {
  Warehouse, FolderTree, Tags, Ruler, Truck, Building2, Briefcase,
  ArrowLeftRight, BarChart3, FileText, AlertTriangle, ClipboardCheck,
  LayoutDashboard, Menu, Download, Printer, ShieldCheck, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReferenceCrudTab } from '@/components/inventory/ReferenceCrudTab';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { WMS_REVIEW_REPORT } from '@/data/wmsReviewReport';
import { downloadDocx, printPdf } from '@/utils/wmsReportRenderer';

export default function Inventory() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('inventoryManagement')}
          subtitle={t('inventoryDesc')}
          icon={Warehouse}
          actions={
            <div className="flex items-center gap-2">
              {/* Primary action — always visible */}
              <Button asChild>
                <Link to="/inventory/movements">
                  <ArrowLeftRight className="w-4 h-4 me-1.5" />
                  {t('stockMovements')}
                </Link>
              </Button>

              {/* Grouped menu — collapses 5 buttons + report actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Menu">
                    <Menu className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>{t('inventoryManagement')}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate('/inventory/dashboard')}>
                    <LayoutDashboard className="w-4 h-4 me-2" />
                    {t('inventoryDashboard')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/inventory/counts')}>
                    <ClipboardCheck className="w-4 h-4 me-2" />
                    {t('stockCounts')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/inventory/balances')}>
                    <BarChart3 className="w-4 h-4 me-2" />
                    {t('stockBalances')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/inventory/stock-card')}>
                    <FileText className="w-4 h-4 me-2" />
                    {t('stockCard')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/inventory/low-stock')}>
                    <AlertTriangle className="w-4 h-4 me-2" />
                    {t('lowStockReport')}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t('technicalReview')}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate('/inventory/review')}>
                    <BookOpen className="w-4 h-4 me-2" />
                    {t('technicalReview')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadDocx(WMS_REVIEW_REPORT)}>
                    <Download className="w-4 h-4 me-2" />
                    {t('downloadDocx')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => printPdf(WMS_REVIEW_REPORT)}>
                    <Printer className="w-4 h-4 me-2" />
                    {t('downloadPdf')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/inventory/qa')}>
                    <ShieldCheck className="w-4 h-4 me-2" />
                    {t('qaVerification')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <Tabs defaultValue="warehouses" className="mt-4">
          <TabsList className="flex flex-wrap h-auto justify-start">
            <TabsTrigger value="warehouses" className="gap-1.5">
              <Warehouse className="w-4 h-4" />
              {t('warehouses')}
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-1.5">
              <FolderTree className="w-4 h-4" />
              {t('itemGroups')}
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5">
              <Tags className="w-4 h-4" />
              {t('itemCategories')}
            </TabsTrigger>
            <TabsTrigger value="uom" className="gap-1.5">
              <Ruler className="w-4 h-4" />
              {t('unitsOfMeasure')}
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-1.5">
              <Truck className="w-4 h-4" />
              {t('suppliersList')}
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-1.5">
              <Building2 className="w-4 h-4" />
              {t('departmentsList')}
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5">
              <Briefcase className="w-4 h-4" />
              {t('projectsList')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="warehouses" className="mt-4">
            <ReferenceCrudTab
              table="warehouses"
              titleKey="warehouses"
              addLabelKey="addWarehouse"
              editLabelKey="editWarehouse"
              extraFields={[
                { name: 'location', labelKey: 'warehouseLocation' },
                { name: 'notes', labelKey: 'notes', type: 'textarea' },
              ]}
              extraColumns={[{ name: 'location', labelKey: 'warehouseLocation' }]}
            />
          </TabsContent>

          <TabsContent value="groups" className="mt-4">
            <ReferenceCrudTab
              table="item_groups"
              titleKey="itemGroups"
              addLabelKey="addItemGroup"
              editLabelKey="editItemGroup"
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <ReferenceCrudTab
              table="item_categories"
              titleKey="itemCategories"
              addLabelKey="addItemCategory"
              editLabelKey="editItemCategory"
            />
          </TabsContent>

          <TabsContent value="uom" className="mt-4">
            <ReferenceCrudTab
              table="units_of_measure"
              titleKey="unitsOfMeasure"
              addLabelKey="addUnit"
              editLabelKey="editUnit"
              extraFields={[
                { name: 'conversion_factor', labelKey: 'conversionFactor', type: 'number' },
              ]}
              extraColumns={[{ name: 'conversion_factor', labelKey: 'conversionFactor' }]}
            />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <ReferenceCrudTab
              table="suppliers"
              titleKey="suppliersList"
              addLabelKey="addSupplier"
              editLabelKey="editSupplier"
              extraFields={[
                { name: 'contact_person', labelKey: 'contactPersonInv' },
                { name: 'phone', labelKey: 'phone' },
                { name: 'email', labelKey: 'email' },
                { name: 'address', labelKey: 'addressInv' },
                { name: 'tax_number', labelKey: 'taxNumberInv' },
                { name: 'notes', labelKey: 'notes', type: 'textarea' },
              ]}
              extraColumns={[
                { name: 'phone', labelKey: 'phone' },
                { name: 'contact_person', labelKey: 'contactPersonInv' },
              ]}
            />
          </TabsContent>

          <TabsContent value="departments" className="mt-4">
            <ReferenceCrudTab
              table="departments"
              titleKey="departmentsList"
              addLabelKey="addDepartment"
              editLabelKey="editDepartment"
              extraFields={[{ name: 'notes', labelKey: 'notes', type: 'textarea' }]}
            />
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <ReferenceCrudTab
              table="projects"
              titleKey="projectsList"
              addLabelKey="addProject"
              editLabelKey="editProject"
              extraFields={[
                { name: 'start_date', labelKey: 'startDateInv', type: 'date' },
                { name: 'end_date', labelKey: 'endDateInv', type: 'date' },
                { name: 'description', labelKey: 'description', type: 'textarea' },
              ]}
              extraColumns={[
                { name: 'start_date', labelKey: 'startDateInv' },
                { name: 'end_date', labelKey: 'endDateInv' },
              ]}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}