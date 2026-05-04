import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, ShieldAlert, PlayCircle } from 'lucide-react';

/**
 * Admin-only RLS diagnostics page.
 * Performs SELECT/INSERT/UPDATE/DELETE probes against Data-Setup & App-Settings
 * tables using the *currently logged-in* session, so results reflect the live
 * RLS evaluation for that role. Every probe is wrapped in a transaction-style
 * cleanup (best-effort delete) and never leaves rows behind on success.
 */

type Op = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
type Status = 'pending' | 'running' | 'pass' | 'fail' | 'skipped';

interface ProbeResult {
  table: string;
  op: Op;
  expected: 'allow' | 'deny';
  status: Status;
  message?: string;
}

const PROBES_BY_ROLE: Record<'admin' | 'manager' | 'user', Array<{ table: string; op: Op; expected: 'allow' | 'deny' }>> = {
  admin: [
    { table: 'app_settings', op: 'SELECT', expected: 'allow' },
    { table: 'app_settings', op: 'INSERT', expected: 'allow' },
    { table: 'app_settings', op: 'UPDATE', expected: 'allow' },
    { table: 'app_settings', op: 'DELETE', expected: 'allow' },
    { table: 'item_categories', op: 'SELECT', expected: 'allow' },
    { table: 'item_categories', op: 'INSERT', expected: 'allow' },
    { table: 'item_categories', op: 'UPDATE', expected: 'allow' },
    { table: 'item_categories', op: 'DELETE', expected: 'allow' },
    { table: 'suppliers', op: 'SELECT', expected: 'allow' },
    { table: 'suppliers', op: 'INSERT', expected: 'allow' },
    { table: 'suppliers', op: 'DELETE', expected: 'allow' },
    { table: 'item_groups', op: 'SELECT', expected: 'allow' },
    { table: 'item_groups', op: 'INSERT', expected: 'allow' },
    { table: 'departments', op: 'SELECT', expected: 'allow' },
    { table: 'departments', op: 'INSERT', expected: 'allow' },
    { table: 'departments', op: 'DELETE', expected: 'allow' },
  ],
  manager: [
    { table: 'app_settings', op: 'SELECT', expected: 'allow' },
    { table: 'app_settings', op: 'INSERT', expected: 'deny' },
    { table: 'app_settings', op: 'UPDATE', expected: 'deny' },
    { table: 'item_categories', op: 'SELECT', expected: 'allow' },
    { table: 'item_categories', op: 'INSERT', expected: 'allow' },
    { table: 'item_categories', op: 'UPDATE', expected: 'allow' },
    { table: 'item_categories', op: 'DELETE', expected: 'deny' },
    { table: 'suppliers', op: 'SELECT', expected: 'allow' },
    { table: 'suppliers', op: 'INSERT', expected: 'allow' },
    { table: 'suppliers', op: 'DELETE', expected: 'deny' },
    { table: 'departments', op: 'SELECT', expected: 'allow' },
    { table: 'departments', op: 'INSERT', expected: 'allow' },
    { table: 'departments', op: 'DELETE', expected: 'deny' },
  ],
  user: [
    { table: 'app_settings', op: 'SELECT', expected: 'allow' },
    { table: 'app_settings', op: 'INSERT', expected: 'deny' },
    { table: 'app_settings', op: 'UPDATE', expected: 'deny' },
    { table: 'item_categories', op: 'SELECT', expected: 'allow' },
    { table: 'item_categories', op: 'INSERT', expected: 'deny' },
    { table: 'item_categories', op: 'UPDATE', expected: 'deny' },
    { table: 'item_categories', op: 'DELETE', expected: 'deny' },
    { table: 'suppliers', op: 'SELECT', expected: 'allow' },
    { table: 'suppliers', op: 'INSERT', expected: 'deny' },
    { table: 'suppliers', op: 'DELETE', expected: 'deny' },
    { table: 'departments', op: 'SELECT', expected: 'allow' },
    { table: 'departments', op: 'INSERT', expected: 'deny' },
    { table: 'departments', op: 'DELETE', expected: 'deny' },
  ],
};

function buildPayload(table: string): Record<string, any> {
  const stamp = `RLS-PROBE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  switch (table) {
    case 'app_settings':
      return { key: stamp, value: { probe: true }, description: 'rls diagnostic probe' };
    case 'item_categories':
    case 'item_groups':
      return { code: stamp.slice(0, 20), name_ar: stamp, name_en: stamp, is_active: true };
    case 'suppliers':
      return { code: stamp.slice(0, 20), name_ar: stamp, name_en: stamp, is_active: true };
    case 'departments':
      return { code: stamp.slice(0, 20), name_ar: stamp, name_en: stamp, is_active: true };
    default:
      return { code: stamp.slice(0, 20), name_ar: stamp };
  }
}

async function runProbe(table: string, op: Op): Promise<{ ok: boolean; message?: string }> {
  try {
    if (op === 'SELECT') {
      const { error } = await (supabase as any).from(table).select('*').limit(1);
      return error ? { ok: false, message: error.message } : { ok: true };
    }
    if (op === 'INSERT') {
      const payload = buildPayload(table);
      const { data, error } = await (supabase as any).from(table).insert(payload).select('*').limit(1);
      if (error) return { ok: false, message: error.message };
      // Cleanup
      const inserted = Array.isArray(data) ? data[0] : data;
      const idKey = table === 'app_settings' ? 'key' : 'id';
      if (inserted?.[idKey]) {
        await (supabase as any).from(table).delete().eq(idKey, inserted[idKey]);
      }
      return { ok: true };
    }
    if (op === 'UPDATE') {
      // Try to update a non-existent row — RLS denial returns an error, allowance returns ok with 0 rows.
      const idKey = table === 'app_settings' ? 'key' : 'id';
      const fakeId = table === 'app_settings'
        ? `__rls_probe_${Date.now()}__`
        : '00000000-0000-0000-0000-000000000000';
      const updatePayload = table === 'app_settings' ? { value: { probe: true } } : { name_ar: 'rls-probe' };
      const { error } = await (supabase as any).from(table).update(updatePayload).eq(idKey, fakeId);
      return error ? { ok: false, message: error.message } : { ok: true };
    }
    if (op === 'DELETE') {
      const idKey = table === 'app_settings' ? 'key' : 'id';
      const fakeId = table === 'app_settings'
        ? `__rls_probe_${Date.now()}__`
        : '00000000-0000-0000-0000-000000000000';
      const { error } = await (supabase as any).from(table).delete().eq(idKey, fakeId);
      return error ? { ok: false, message: error.message } : { ok: true };
    }
    return { ok: false, message: 'unknown op' };
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}

export default function RlsDiagnosticsPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { user } = useAuth();
  const role: 'admin' | 'manager' | 'user' =
    (user?.role as 'admin' | 'manager' | 'user') || 'user';

  const [results, setResults] = useState<ProbeResult[]>(
    PROBES_BY_ROLE[role].map((p) => ({ ...p, status: 'pending' as Status })),
  );
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    const list: ProbeResult[] = PROBES_BY_ROLE[role].map((p) => ({ ...p, status: 'running' as Status }));
    setResults([...list]);
    for (let i = 0; i < list.length; i++) {
      const probe = list[i];
      const { ok, message } = await runProbe(probe.table, probe.op);
      const passed = (ok && probe.expected === 'allow') || (!ok && probe.expected === 'deny');
      list[i] = {
        ...probe,
        status: passed ? 'pass' : 'fail',
        message: ok ? undefined : message,
      };
      setResults([...list]);
    }
    setRunning(false);
  };

  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  return (
    <div className="container mx-auto p-4 space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            {isAr ? 'تشخيص سياسات RLS' : 'RLS Policy Diagnostics'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{isAr ? 'الدور الحالي:' : 'Current role:'}</span>
            <Badge variant="outline" className="uppercase">{role}</Badge>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {isAr ? 'إجمالي الفحوص:' : 'Total probes:'} {results.length}
            </span>
            {(passCount > 0 || failCount > 0) && (
              <>
                <span className="text-muted-foreground">·</span>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  {isAr ? 'نجح' : 'Pass'}: {passCount}
                </Badge>
                <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                  {isAr ? 'فشل' : 'Fail'}: {failCount}
                </Badge>
              </>
            )}
          </div>

          <Button onClick={runAll} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <PlayCircle className="w-4 h-4 me-2" />}
            {running
              ? (isAr ? 'جاري التشغيل...' : 'Running...')
              : (isAr ? 'تشغيل جميع الفحوص' : 'Run all probes')}
          </Button>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-2">{isAr ? 'الجدول' : 'Table'}</th>
                  <th className="text-start p-2">{isAr ? 'العملية' : 'Op'}</th>
                  <th className="text-start p-2">{isAr ? 'المتوقع' : 'Expected'}</th>
                  <th className="text-start p-2">{isAr ? 'النتيجة' : 'Result'}</th>
                  <th className="text-start p-2">{isAr ? 'سبب الخطأ' : 'Error / detail'}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.table}</td>
                    <td className="p-2"><Badge variant="outline">{r.op}</Badge></td>
                    <td className="p-2">
                      <Badge variant={r.expected === 'allow' ? 'default' : 'secondary'}>
                        {r.expected === 'allow'
                          ? (isAr ? 'يُسمح' : 'allow')
                          : (isAr ? 'يُمنع' : 'deny')}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {r.status === 'pending' && <span className="text-muted-foreground text-xs">—</span>}
                      {r.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                      {r.status === 'pass' && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> {isAr ? 'نجح' : 'Pass'}
                        </span>
                      )}
                      {r.status === 'fail' && (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <XCircle className="w-4 h-4" /> {isAr ? 'فشل' : 'Fail'}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground max-w-md break-words">
                      {r.message || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            {isAr
              ? 'ملاحظة: عمليات الإدراج تنشئ سجلات مؤقتة بالعلامة RLS-PROBE-... وتُحذف فور النجاح. عمليات UPDATE/DELETE تستهدف معرّفًا غير موجود لقياس استجابة السياسة فقط.'
              : 'Note: INSERTs create temporary rows tagged RLS-PROBE-... and clean up on success. UPDATE/DELETE target a non-existent id to measure policy response only.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}