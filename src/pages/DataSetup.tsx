import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SimpleCrudTable } from '@/components/data-setup/SimpleCrudTable';
import {
  useCategories, useUnits, useSuppliers, useProjects, useReceivingStaff, useUomConversions, useBranches,
} from '@/hooks/useDataSetup';
import { Database, Layers, Ruler, Truck, FolderKanban, UserCheck, ArrowLeftRight, Building2 } from 'lucide-react';

export default function DataSetup() {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const cats = useCategories();
  const uoms = useUnits();
  const sups = useSuppliers();
  const prjs = useProjects();
  const stf = useReceivingStaff();
  const conv = useUomConversions();
  const brn = useBranches();

  const uomOptions = useMemo(
    () => uoms.rows.filter((u: any) => u.is_active !== false).map((u: any) => ({
      value: u.id,
      label: `${u.code} — ${isAr ? u.name_ar : u.name_en}`,
    })),
    [uoms.rows, isAr]
  );

  const uomLabel = (id: string) => {
    const u: any = uoms.rows.find((r: any) => r.id === id);
    return u ? `${u.code} (${isAr ? u.name_ar : u.name_en})` : '—';
  };

  const conversionRows = useMemo(
    () => conv.rows.map((r: any) => ({
      ...r,
      from_uom_label: uomLabel(r.from_uom_id),
      to_uom_label: uomLabel(r.to_uom_id),
    })),
    [conv.rows, uoms.rows, isAr]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <PageHeader
          title={t('dataSetup')}
          subtitle={t('dataSetupSubtitle')}
          icon={Database}
        />

        <Tabs defaultValue="categories" className="mt-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="categories"><Layers className="h-4 w-4 me-1" />{t('categories')}</TabsTrigger>
            <TabsTrigger value="units"><Ruler className="h-4 w-4 me-1" />{t('unitsOfMeasure')}</TabsTrigger>
            <TabsTrigger value="conversions"><ArrowLeftRight className="h-4 w-4 me-1" />{t('uomConversions')}</TabsTrigger>
            <TabsTrigger value="suppliers"><Truck className="h-4 w-4 me-1" />{t('suppliers')}</TabsTrigger>
            <TabsTrigger value="projects"><FolderKanban className="h-4 w-4 me-1" />{t('projects')}</TabsTrigger>
            <TabsTrigger value="staff"><UserCheck className="h-4 w-4 me-1" />{t('receivingStaff')}</TabsTrigger>
            <TabsTrigger value="branches"><Building2 className="h-4 w-4 me-1" />{t('branches')}</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4">
            <SimpleCrudTable
              rows={cats.rows} loading={cats.loading}
              onCreate={cats.create} onUpdate={cats.update} onDelete={cats.remove}
              searchKeys={['code', 'name_ar', 'name_en']}
              fields={[
                { key: 'code', label: t('code'), required: true },
                { key: 'name_ar', label: t('nameAr'), required: true },
                { key: 'name_en', label: t('nameEn'), required: true },
              ]}
              columns={[
                { key: 'code', label: t('code') },
                { key: isAr ? 'name_ar' : 'name_en', label: t('name') },
              ]}
            />
          </TabsContent>

          <TabsContent value="units" className="mt-4">
            <SimpleCrudTable
              rows={uoms.rows} loading={uoms.loading}
              onCreate={uoms.create} onUpdate={uoms.update} onDelete={uoms.remove}
              searchKeys={['code', 'name_ar', 'name_en']}
              fields={[
                { key: 'code', label: t('code'), required: true },
                { key: 'name_ar', label: t('nameAr'), required: true },
                { key: 'name_en', label: t('nameEn'), required: true },
                { key: 'conversion_factor', label: t('conversionFactor'), type: 'number' },
              ]}
              columns={[
                { key: 'code', label: t('code') },
                { key: isAr ? 'name_ar' : 'name_en', label: t('name') },
                { key: 'conversion_factor', label: t('conversionFactor') },
              ]}
            />
          </TabsContent>

          <TabsContent value="conversions" className="mt-4">
            <SimpleCrudTable
              rows={conversionRows} loading={conv.loading || uoms.loading}
              onCreate={conv.create} onUpdate={conv.update} onDelete={conv.remove}
              searchKeys={['from_uom_label', 'to_uom_label', 'notes']}
              fields={[
                { key: 'from_uom_id', label: t('fromUnit'), type: 'select', required: true, options: uomOptions },
                { key: 'to_uom_id', label: t('toUnit'), type: 'select', required: true, options: uomOptions },
                { key: 'factor', label: t('conversionFactor'), type: 'number', required: true },
                { key: 'notes', label: t('notes'), type: 'textarea' },
              ]}
              columns={[
                { key: 'from_uom_label', label: t('fromUnit') },
                { key: 'to_uom_label', label: t('toUnit') },
                { key: 'factor', label: t('conversionFactor') },
              ]}
            />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <SimpleCrudTable
              rows={sups.rows} loading={sups.loading}
              onCreate={sups.create} onUpdate={sups.update} onDelete={sups.remove}
              searchKeys={['code', 'name_ar', 'name_en', 'phone', 'email']}
              fields={[
                { key: 'code', label: t('code'), required: true },
                { key: 'name_ar', label: t('nameAr'), required: true },
                { key: 'name_en', label: t('nameEn'), required: true },
                { key: 'contact_person', label: t('contactPerson') },
                { key: 'phone', label: t('phone'), type: 'tel' },
                { key: 'email', label: t('email'), type: 'email' },
                { key: 'address', label: t('address'), type: 'textarea' },
                { key: 'tax_number', label: t('taxNumber') },
                { key: 'notes', label: t('notes'), type: 'textarea' },
              ]}
              columns={[
                { key: 'code', label: t('code') },
                { key: isAr ? 'name_ar' : 'name_en', label: t('name') },
                { key: 'phone', label: t('phone') },
                { key: 'email', label: t('email') },
              ]}
            />
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <SimpleCrudTable
              rows={prjs.rows} loading={prjs.loading}
              onCreate={prjs.create} onUpdate={prjs.update} onDelete={prjs.remove}
              searchKeys={['code', 'name_ar', 'name_en']}
              fields={[
                { key: 'code', label: t('code'), required: true },
                { key: 'name_ar', label: t('nameAr'), required: true },
                { key: 'name_en', label: t('nameEn'), required: true },
                { key: 'description', label: t('description'), type: 'textarea' },
                { key: 'start_date', label: t('startDate'), type: 'date' },
                { key: 'end_date', label: t('endDate'), type: 'date' },
                { key: 'status', label: t('status') },
              ]}
              columns={[
                { key: 'code', label: t('code') },
                { key: isAr ? 'name_ar' : 'name_en', label: t('name') },
                { key: 'status', label: t('status') },
              ]}
            />
          </TabsContent>

          <TabsContent value="staff" className="mt-4">
            <SimpleCrudTable
              rows={stf.rows} loading={stf.loading}
              onCreate={stf.create} onUpdate={stf.update} onDelete={stf.remove}
              searchKeys={['full_name', 'employee_no', 'personal_id', 'phone']}
              fields={[
                { key: 'full_name', label: t('fullName'), required: true },
                { key: 'employee_no', label: t('employeeNo') },
                { key: 'personal_id', label: t('personalId') },
                { key: 'job_title', label: t('jobTitle') },
                { key: 'phone', label: t('phone'), type: 'tel' },
                { key: 'authorized_by', label: t('authorizedBy') },
                { key: 'notes', label: t('notes'), type: 'textarea' },
              ]}
              columns={[
                { key: 'employee_no', label: t('employeeNo') },
                { key: 'full_name', label: t('fullName') },
                { key: 'job_title', label: t('jobTitle') },
                { key: 'phone', label: t('phone') },
              ]}
            />
          </TabsContent>

          <TabsContent value="branches" className="mt-4">
            <SimpleCrudTable
              rows={brn.rows} loading={brn.loading}
              onCreate={brn.create} onUpdate={brn.update} onDelete={brn.remove}
              searchKeys={['code', 'name_ar', 'name_en', 'manager_name', 'phone']}
              fields={[
                { key: 'code', label: t('code'), required: true },
                { key: 'name_ar', label: t('nameAr'), required: true },
                { key: 'name_en', label: t('nameEn') },
                { key: 'manager_name', label: t('managerName') },
                { key: 'phone', label: t('phone'), type: 'tel' },
                { key: 'address', label: t('address'), type: 'textarea' },
                { key: 'notes', label: t('notes'), type: 'textarea' },
              ]}
              columns={[
                { key: 'code', label: t('code') },
                { key: isAr ? 'name_ar' : 'name_en', label: t('name') },
                { key: 'manager_name', label: t('managerName') },
                { key: 'phone', label: t('phone') },
              ]}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}