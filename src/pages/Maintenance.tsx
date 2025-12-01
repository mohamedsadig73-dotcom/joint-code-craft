import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaintenanceDashboard } from '@/components/maintenance/MaintenanceDashboard';
import { VendorsManagement } from '@/components/maintenance/VendorsManagement';
import { AssetsManagement } from '@/components/maintenance/AssetsManagement';
import { MaintenanceItems } from '@/components/maintenance/MaintenanceItems';
import { AnnualSchedule } from '@/components/maintenance/AnnualSchedule';
import { Wrench, Building2, Package, Calendar, LayoutDashboard } from 'lucide-react';

export default function Maintenance() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">
            نظام الصيانة الدورية
          </h1>
          <p className="text-muted-foreground">
            إدارة شاملة لعمليات الصيانة والأصول والموردين
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="w-4 h-4" />
                لوحة التحكم
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2">
                <Calendar className="w-4 h-4" />
                الجدول السنوي
              </TabsTrigger>
              <TabsTrigger value="items" className="gap-2">
                <Wrench className="w-4 h-4" />
                بنود الصيانة
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-2">
                <Building2 className="w-4 h-4" />
                الأصول
              </TabsTrigger>
              <TabsTrigger value="vendors" className="gap-2">
                <Package className="w-4 h-4" />
                الموردين
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <MaintenanceDashboard />
            </TabsContent>

            <TabsContent value="schedule">
              <AnnualSchedule />
            </TabsContent>

            <TabsContent value="items">
              <MaintenanceItems />
            </TabsContent>

            <TabsContent value="assets">
              <AssetsManagement />
            </TabsContent>

            <TabsContent value="vendors">
              <VendorsManagement />
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
