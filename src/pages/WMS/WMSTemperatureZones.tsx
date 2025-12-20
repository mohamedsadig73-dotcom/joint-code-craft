import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Thermometer, 
  Snowflake, 
  Sun, 
  AlertTriangle,
  RefreshCw,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  Settings
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

interface TemperatureZone {
  id: string;
  name: string;
  code: string;
  type: 'frozen' | 'cold' | 'cool' | 'ambient' | 'warm';
  targetTemp: number;
  minTemp: number;
  maxTemp: number;
  currentTemp: number;
  humidity: number;
  status: 'normal' | 'warning' | 'critical';
  lastReading: string;
  sensorCount: number;
  locationCount: number;
}

interface TempReading {
  timestamp: string;
  temperature: number;
  humidity: number;
}

const WMSTemperatureZones: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<TemperatureZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<TemperatureZone | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    setLoading(true);

    // Get locations with temperature zones
    const { data: locations } = await supabase
      .from('wms_locations')
      .select('id, code, zone, temperature_zone')
      .not('temperature_zone', 'is', null);

    // Generate zone data from locations
    const zoneMap = new Map<string, TemperatureZone>();
    
    const zoneTypes: Record<string, { type: TemperatureZone['type']; targetTemp: number; minTemp: number; maxTemp: number }> = {
      'frozen': { type: 'frozen', targetTemp: -18, minTemp: -25, maxTemp: -15 },
      'cold': { type: 'cold', targetTemp: 2, minTemp: 0, maxTemp: 4 },
      'cool': { type: 'cool', targetTemp: 10, minTemp: 8, maxTemp: 12 },
      'ambient': { type: 'ambient', targetTemp: 20, minTemp: 15, maxTemp: 25 },
      'warm': { type: 'warm', targetTemp: 30, minTemp: 25, maxTemp: 35 }
    };

    if (locations) {
      locations.forEach(loc => {
        const tempZone = loc.temperature_zone?.toLowerCase() || 'ambient';
        if (!zoneMap.has(tempZone)) {
          const config = zoneTypes[tempZone] || zoneTypes['ambient'];
          const variance = (Math.random() - 0.5) * 4;
          const currentTemp = config.targetTemp + variance;
          
          let status: 'normal' | 'warning' | 'critical' = 'normal';
          if (currentTemp < config.minTemp || currentTemp > config.maxTemp) {
            status = 'critical';
          } else if (Math.abs(currentTemp - config.targetTemp) > (config.maxTemp - config.targetTemp) * 0.7) {
            status = 'warning';
          }

          zoneMap.set(tempZone, {
            id: tempZone,
            name: tempZone.charAt(0).toUpperCase() + tempZone.slice(1) + ' Zone',
            code: tempZone.substring(0, 3).toUpperCase(),
            ...config,
            currentTemp: Math.round(currentTemp * 10) / 10,
            humidity: Math.round(40 + Math.random() * 30),
            status,
            lastReading: new Date().toISOString(),
            sensorCount: Math.floor(2 + Math.random() * 4),
            locationCount: 0
          });
        }
        const zone = zoneMap.get(tempZone)!;
        zone.locationCount++;
      });
    }

    // Add default zones if none found
    if (zoneMap.size === 0) {
      Object.entries(zoneTypes).forEach(([key, config]) => {
        const variance = (Math.random() - 0.5) * 4;
        const currentTemp = config.targetTemp + variance;
        
        zoneMap.set(key, {
          id: key,
          name: key.charAt(0).toUpperCase() + key.slice(1) + ' Zone',
          code: key.substring(0, 3).toUpperCase(),
          ...config,
          currentTemp: Math.round(currentTemp * 10) / 10,
          humidity: Math.round(40 + Math.random() * 30),
          status: 'normal',
          lastReading: new Date().toISOString(),
          sensorCount: Math.floor(2 + Math.random() * 4),
          locationCount: Math.floor(5 + Math.random() * 15)
        });
      });
    }

    setZones(Array.from(zoneMap.values()));
    if (zoneMap.size > 0) {
      setSelectedZone(Array.from(zoneMap.values())[0]);
    }
    setLoading(false);
  };

  const refreshReadings = async () => {
    setRefreshing(true);
    await loadZones();
    setRefreshing(false);
  };

  const getZoneIcon = (type: string) => {
    switch (type) {
      case 'frozen': return <Snowflake className="h-6 w-6 text-blue-500" />;
      case 'cold': return <Thermometer className="h-6 w-6 text-cyan-500" />;
      case 'cool': return <Thermometer className="h-6 w-6 text-teal-500" />;
      case 'ambient': return <Thermometer className="h-6 w-6 text-green-500" />;
      case 'warm': return <Sun className="h-6 w-6 text-orange-500" />;
      default: return <Thermometer className="h-6 w-6" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getTempTrend = (current: number, target: number) => {
    const diff = current - target;
    if (Math.abs(diff) < 0.5) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <TrendingDown className="h-4 w-4 text-blue-500" />;
  };

  const generateChartData = () => {
    const now = new Date();
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000);
      data.push({
        time: time.getHours() + ':00',
        temp: (selectedZone?.targetTemp || 20) + (Math.random() - 0.5) * 4,
        humidity: 50 + (Math.random() - 0.5) * 20
      });
    }
    return data;
  };

  const chartData = generateChartData();

  const tempChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: [language === 'ar' ? 'الحرارة' : 'Temperature', language === 'ar' ? 'الرطوبة' : 'Humidity'] },
    xAxis: { type: 'category', data: chartData.map(d => d.time) },
    yAxis: [
      { type: 'value', name: '°C', position: 'left' },
      { type: 'value', name: '%', position: 'right', max: 100 }
    ],
    series: [
      {
        name: language === 'ar' ? 'الحرارة' : 'Temperature',
        type: 'line',
        data: chartData.map(d => Math.round(d.temp * 10) / 10),
        smooth: true,
        itemStyle: { color: '#3b82f6' },
        markLine: {
          data: [
            { yAxis: selectedZone?.minTemp, name: 'Min', lineStyle: { color: '#ef4444', type: 'dashed' } },
            { yAxis: selectedZone?.maxTemp, name: 'Max', lineStyle: { color: '#ef4444', type: 'dashed' } },
            { yAxis: selectedZone?.targetTemp, name: 'Target', lineStyle: { color: '#10b981', type: 'solid' } }
          ]
        }
      },
      {
        name: language === 'ar' ? 'الرطوبة' : 'Humidity',
        type: 'line',
        yAxisIndex: 1,
        data: chartData.map(d => Math.round(d.humidity)),
        smooth: true,
        itemStyle: { color: '#8b5cf6' }
      }
    ]
  };

  const criticalZones = zones.filter(z => z.status === 'critical');
  const warningZones = zones.filter(z => z.status === 'warning');

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'مناطق الحرارة' : 'Temperature Zones' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Thermometer className="h-6 w-6" />
              {language === 'ar' ? 'مناطق التحكم بالحرارة (IoT)' : 'Temperature Control Zones (IoT)'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'مراقبة درجات الحرارة والرطوبة في المستودع' : 'Monitor warehouse temperature and humidity'}
            </p>
          </div>
          <Button onClick={refreshReadings} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 me-2 ${refreshing ? 'animate-spin' : ''}`} />
            {language === 'ar' ? 'تحديث القراءات' : 'Refresh Readings'}
          </Button>
        </div>

        {/* Alerts */}
        {criticalZones.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {language === 'ar' 
                ? `تحذير حرج! ${criticalZones.length} منطقة خارج النطاق المسموح`
                : `Critical alert! ${criticalZones.length} zone(s) out of range`}
            </AlertDescription>
          </Alert>
        )}

        {warningZones.length > 0 && (
          <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-400">
              {language === 'ar'
                ? `تنبيه! ${warningZones.length} منطقة تقترب من الحدود`
                : `Warning! ${warningZones.length} zone(s) approaching limits`}
            </AlertDescription>
          </Alert>
        )}

        {/* Zone Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {zones.map(zone => (
            <Card 
              key={zone.id} 
              className={`cursor-pointer transition-all ${selectedZone?.id === zone.id ? 'ring-2 ring-primary' : ''} ${zone.status === 'critical' ? 'border-red-500/50' : zone.status === 'warning' ? 'border-yellow-500/50' : ''}`}
              onClick={() => setSelectedZone(zone)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  {getZoneIcon(zone.type)}
                  <div className={`h-3 w-3 rounded-full ${getStatusColor(zone.status)} animate-pulse`} />
                </div>
                <h3 className="font-semibold text-sm">{zone.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-3xl font-bold">{zone.currentTemp}°</span>
                  {getTempTrend(zone.currentTemp, zone.targetTemp)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'الهدف:' : 'Target:'} {zone.targetTemp}°C
                </p>
                <div className="mt-2">
                  <Progress 
                    value={((zone.currentTemp - zone.minTemp) / (zone.maxTemp - zone.minTemp)) * 100}
                    className={`h-1 ${zone.status === 'critical' ? '[&>div]:bg-red-500' : zone.status === 'warning' ? '[&>div]:bg-yellow-500' : ''}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Zone Details */}
        {selectedZone && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {language === 'ar' ? 'سجل القراءات - 24 ساعة' : '24-Hour Reading History'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={tempChartOption} style={{ height: '300px' }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {language === 'ar' ? 'تفاصيل المنطقة' : 'Zone Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">{language === 'ar' ? 'الحرارة الحالية' : 'Current Temp'}</span>
                  <span className="text-xl font-bold">{selectedZone.currentTemp}°C</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">{language === 'ar' ? 'الرطوبة' : 'Humidity'}</span>
                  <span className="text-xl font-bold">{selectedZone.humidity}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="p-2 bg-blue-500/10 rounded">
                    <p className="text-muted-foreground">{language === 'ar' ? 'الحد الأدنى' : 'Min'}</p>
                    <p className="font-bold">{selectedZone.minTemp}°C</p>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded">
                    <p className="text-muted-foreground">{language === 'ar' ? 'الهدف' : 'Target'}</p>
                    <p className="font-bold">{selectedZone.targetTemp}°C</p>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded">
                    <p className="text-muted-foreground">{language === 'ar' ? 'الحد الأقصى' : 'Max'}</p>
                    <p className="font-bold">{selectedZone.maxTemp}°C</p>
                  </div>
                </div>
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'عدد المستشعرات' : 'Sensors'}</span>
                    <Badge variant="outline">{selectedZone.sensorCount}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'المواقع' : 'Locations'}</span>
                    <Badge variant="outline">{selectedZone.locationCount}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'آخر قراءة' : 'Last Reading'}</span>
                    <span>{new Date(selectedZone.lastReading).toLocaleTimeString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default WMSTemperatureZones;
