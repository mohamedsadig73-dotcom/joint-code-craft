import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Thermometer, Plus, AlertTriangle, CheckCircle, AlertCircle, Droplets, RefreshCw, Snowflake, Sun } from 'lucide-react';
import { format } from 'date-fns';
import ReactECharts from 'echarts-for-react';

export default function WMSTemperatureZones() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = language === 'ar';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [formData, setFormData] = useState({
    zone_name: '',
    zone_code: '',
    target_temp_min: '',
    target_temp_max: '',
    humidity_min: '',
    humidity_max: '',
    sensor_id: ''
  });

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['wms-temperature-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_temperature_zones')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const minTemp = data.target_temp_min ? parseFloat(data.target_temp_min) : null;
      const maxTemp = data.target_temp_max ? parseFloat(data.target_temp_max) : null;
      const currentTemp = minTemp && maxTemp ? (minTemp + maxTemp) / 2 : null;
      
      const { error } = await supabase.from('wms_temperature_zones').insert({
        zone_name: data.zone_name,
        zone_code: data.zone_code,
        target_temp_min: minTemp,
        target_temp_max: maxTemp,
        humidity_min: data.humidity_min ? parseFloat(data.humidity_min) : null,
        humidity_max: data.humidity_max ? parseFloat(data.humidity_max) : null,
        sensor_id: data.sensor_id || null,
        current_temp: currentTemp,
        current_humidity: 50
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-temperature-zones'] });
      toast({ title: language === 'ar' ? 'تمت إضافة المنطقة بنجاح' : 'Zone added successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  });

  const simulateReadingMutation = useMutation({
    mutationFn: async (zoneId: string) => {
      const zone = zones.find((z: any) => z.id === zoneId);
      if (!zone) return;

      const tempVariation = (Math.random() - 0.5) * 4;
      const humidityVariation = (Math.random() - 0.5) * 10;
      
      const newTemp = (zone.current_temp || 20) + tempVariation;
      const newHumidity = Math.max(0, Math.min(100, (zone.current_humidity || 50) + humidityVariation));

      let status = 'normal';
      if (zone.target_temp_min && zone.target_temp_max) {
        if (newTemp < zone.target_temp_min - 2 || newTemp > zone.target_temp_max + 2) {
          status = 'critical';
        } else if (newTemp < zone.target_temp_min || newTemp > zone.target_temp_max) {
          status = 'warning';
        }
      }

      const { error } = await supabase
        .from('wms_temperature_zones')
        .update({
          current_temp: Math.round(newTemp * 10) / 10,
          current_humidity: Math.round(newHumidity * 10) / 10,
          status,
          last_reading_at: new Date().toISOString()
        })
        .eq('id', zoneId);
      if (error) throw error;

      await supabase.from('wms_temperature_logs').insert({
        zone_id: zoneId,
        temperature: Math.round(newTemp * 10) / 10,
        humidity: Math.round(newHumidity * 10) / 10,
        status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-temperature-zones'] });
    }
  });

  const resetForm = () => {
    setFormData({
      zone_name: '',
      zone_code: '',
      target_temp_min: '',
      target_temp_max: '',
      humidity_min: '',
      humidity_max: '',
      sensor_id: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'critical': return <Badge variant="destructive">{language === 'ar' ? 'حرج' : 'Critical'}</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">{language === 'ar' ? 'تحذير' : 'Warning'}</Badge>;
      default: return <Badge className="bg-green-500">{language === 'ar' ? 'طبيعي' : 'Normal'}</Badge>;
    }
  };

  const getZoneIcon = (currentTemp: number | null) => {
    if (!currentTemp) return <Thermometer className="h-6 w-6 text-green-500" />;
    if (currentTemp < 0) return <Snowflake className="h-6 w-6 text-blue-500" />;
    if (currentTemp > 25) return <Sun className="h-6 w-6 text-orange-500" />;
    return <Thermometer className="h-6 w-6 text-teal-500" />;
  };

  const getTempProgress = (zone: any) => {
    if (!zone.target_temp_min || !zone.target_temp_max || !zone.current_temp) return 50;
    const range = zone.target_temp_max - zone.target_temp_min;
    const position = zone.current_temp - zone.target_temp_min;
    return Math.max(0, Math.min(100, (position / range) * 100));
  };

  const generateChartData = (zone: any) => {
    const data = [];
    for (let i = 23; i >= 0; i--) {
      data.push({
        time: `${23 - i}:00`,
        temp: (zone?.current_temp || 20) + (Math.random() - 0.5) * 4
      });
    }
    return data;
  };

  const chartOption = selectedZone ? {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: generateChartData(selectedZone).map(d => d.time) },
    yAxis: { type: 'value', name: '°C' },
    series: [{
      name: language === 'ar' ? 'الحرارة' : 'Temperature',
      type: 'line',
      data: generateChartData(selectedZone).map(d => Math.round(d.temp * 10) / 10),
      smooth: true,
      itemStyle: { color: '#3b82f6' },
      markLine: {
        data: [
          { yAxis: selectedZone?.target_temp_min, lineStyle: { color: '#ef4444', type: 'dashed' } },
          { yAxis: selectedZone?.target_temp_max, lineStyle: { color: '#ef4444', type: 'dashed' } }
        ]
      }
    }]
  } : {};

  const criticalZones = zones.filter((z: any) => z.status === 'critical');
  const warningZones = zones.filter((z: any) => z.status === 'warning');
  const normalZones = zones.filter((z: any) => z.status === 'normal' || !z.status);

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'مناطق الحرارة' : 'Temperature Zones' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Thermometer className="h-6 w-6" />
              {language === 'ar' ? 'مناطق التحكم بالحرارة' : 'Temperature Control Zones'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'مراقبة درجات الحرارة والرطوبة' : 'Monitor temperature and humidity'}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إضافة منطقة' : 'Add Zone'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{language === 'ar' ? 'إضافة منطقة حرارية' : 'Add Temperature Zone'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اسم المنطقة' : 'Zone Name'}</Label>
                    <Input value={formData.zone_name} onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'رمز المنطقة' : 'Zone Code'}</Label>
                    <Input value={formData.zone_code} onChange={(e) => setFormData({ ...formData, zone_code: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الحد الأدنى (°C)' : 'Min Temp (°C)'}</Label>
                    <Input type="number" step="0.1" value={formData.target_temp_min} onChange={(e) => setFormData({ ...formData, target_temp_min: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الحد الأعلى (°C)' : 'Max Temp (°C)'}</Label>
                    <Input type="number" step="0.1" value={formData.target_temp_max} onChange={(e) => setFormData({ ...formData, target_temp_max: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الحد الأدنى للرطوبة (%)' : 'Min Humidity (%)'}</Label>
                    <Input type="number" step="0.1" value={formData.humidity_min} onChange={(e) => setFormData({ ...formData, humidity_min: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الحد الأعلى للرطوبة (%)' : 'Max Humidity (%)'}</Label>
                    <Input type="number" step="0.1" value={formData.humidity_max} onChange={(e) => setFormData({ ...formData, humidity_max: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'معرف المستشعر' : 'Sensor ID'}</Label>
                  <Input value={formData.sensor_id} onChange={(e) => setFormData({ ...formData, sensor_id: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                  <Button type="submit" disabled={createMutation.isPending}>{language === 'ar' ? 'إنشاء' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alerts */}
        {criticalZones.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {language === 'ar' ? `تحذير حرج! ${criticalZones.length} منطقة خارج النطاق` : `Critical! ${criticalZones.length} zone(s) out of range`}
            </AlertDescription>
          </Alert>
        )}

        {warningZones.length > 0 && (
          <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-400">
              {language === 'ar' ? `تنبيه! ${warningZones.length} منطقة تقترب من الحدود` : `Warning! ${warningZones.length} zone(s) approaching limits`}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10"><Thermometer className="h-6 w-6 text-blue-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المناطق' : 'Total Zones'}</p>
                  <p className="text-2xl font-bold">{zones.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10"><CheckCircle className="h-6 w-6 text-green-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'طبيعي' : 'Normal'}</p>
                  <p className="text-2xl font-bold text-green-600">{normalZones.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-yellow-500/10"><AlertTriangle className="h-6 w-6 text-yellow-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تحذير' : 'Warning'}</p>
                  <p className="text-2xl font-bold text-yellow-600">{warningZones.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-500/10"><AlertCircle className="h-6 w-6 text-red-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'حرج' : 'Critical'}</p>
                  <p className="text-2xl font-bold text-red-600">{criticalZones.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zones Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : zones.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Thermometer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد مناطق. أضف منطقة جديدة للبدء.' : 'No zones. Add a new zone to get started.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {zones.map((zone: any) => (
                <Card 
                  key={zone.id} 
                  className={`cursor-pointer transition-all ${selectedZone?.id === zone.id ? 'ring-2 ring-primary' : ''} ${zone.status === 'critical' ? 'border-red-500' : zone.status === 'warning' ? 'border-yellow-500' : ''}`}
                  onClick={() => setSelectedZone(zone)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      {getZoneIcon(zone.current_temp)}
                      {getStatusBadge(zone.status)}
                    </div>
                    <h3 className="font-semibold">{zone.zone_name}</h3>
                    <p className="text-sm text-muted-foreground font-mono mb-2">{zone.zone_code}</p>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1">
                        <Thermometer className="w-4 h-4 text-orange-500" />
                        <span className="text-xl font-bold">{zone.current_temp?.toFixed(1) || '--'}°C</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span className="text-lg">{zone.current_humidity?.toFixed(0) || '--'}%</span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      {language === 'ar' ? 'النطاق:' : 'Range:'} {zone.target_temp_min}°C - {zone.target_temp_max}°C
                    </div>
                    <Progress 
                      value={getTempProgress(zone)} 
                      className={`h-2 mt-2 ${zone.status === 'critical' ? '[&>div]:bg-red-500' : zone.status === 'warning' ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                    />

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3 gap-2"
                      onClick={(e) => { e.stopPropagation(); simulateReadingMutation.mutate(zone.id); }}
                      disabled={simulateReadingMutation.isPending}
                    >
                      <RefreshCw className={`w-4 h-4 ${simulateReadingMutation.isPending ? 'animate-spin' : ''}`} />
                      {language === 'ar' ? 'محاكاة قراءة' : 'Simulate Reading'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart */}
            {selectedZone && (
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'سجل القراءات - 24 ساعة' : '24-Hour History'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={chartOption} style={{ height: '300px' }} />
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span>{language === 'ar' ? 'الحرارة الحالية' : 'Current Temp'}</span>
                      <span className="font-bold">{selectedZone.current_temp?.toFixed(1)}°C</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span>{language === 'ar' ? 'الرطوبة' : 'Humidity'}</span>
                      <span className="font-bold">{selectedZone.current_humidity?.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span>{language === 'ar' ? 'آخر قراءة' : 'Last Reading'}</span>
                      <span>{selectedZone.last_reading_at ? format(new Date(selectedZone.last_reading_at), 'HH:mm:ss') : '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}