import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';

const DEST_LABEL: Record<string, { ar: string; en: string }> = {
  morocco: { ar: 'المغرب', en: 'Morocco' },
  uzbekistan: { ar: 'أوزبكستان', en: 'Uzbekistan' },
  unspecified: { ar: 'غير محدد', en: 'Unspecified' },
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  h1: { fontSize: 16, marginBottom: 4, fontWeight: 700, textAlign: 'center' },
  sub: { fontSize: 9, color: '#666', textAlign: 'center', marginBottom: 14 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1F2C',
  },
  row: { flexDirection: 'row' },
  th: {
    backgroundColor: '#1A1F2C',
    color: '#FFFFFF',
    padding: 5,
    fontWeight: 700,
    borderRightWidth: 1,
    borderRightColor: '#FFFFFF',
  },
  td: { padding: 5, borderRightWidth: 1, borderRightColor: '#DDD', borderBottomWidth: 1, borderBottomColor: '#DDD' },
  tdNum: { textAlign: 'right' },
  totalRow: { backgroundColor: '#FFD700', fontWeight: 700 },
  meta: { fontSize: 9, color: '#444', marginBottom: 2 },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 8, color: '#888', textAlign: 'center' },
});

interface ByBox {
  box_no: string;
  destination: string;
  items: number;
  qty: number;
}
interface ByDest {
  destination: string;
  boxes: number;
  items: number;
  qty: number;
  loose: number;
  looseQty: number;
}

function aggregate(receipts: BoxReceipt[]) {
  const active = receipts.filter((r) => !r.deleted_at);
  const merged = receipts.filter(
    (r) => !!r.deleted_at && (r.notes ?? '').toLowerCase().includes('merged into')
  ).length;

  const byBoxMap = new Map<string, ByBox>();
  for (const r of active) {
    if (r.packing_type !== 'boxed' || !r.box_no) continue;
    const key = `${r.box_no}__${r.destination}`;
    const cur = byBoxMap.get(key) ?? {
      box_no: r.box_no,
      destination: r.destination,
      items: 0,
      qty: 0,
    };
    cur.items += 1;
    cur.qty += r.qty;
    byBoxMap.set(key, cur);
  }
  const byBox = Array.from(byBoxMap.values()).sort((a, b) =>
    a.box_no.localeCompare(b.box_no)
  );

  const byDestMap = new Map<string, ByDest>();
  for (const r of active) {
    const key = r.destination;
    const cur = byDestMap.get(key) ?? {
      destination: r.destination,
      boxes: 0,
      items: 0,
      qty: 0,
      loose: 0,
      looseQty: 0,
    };
    cur.items += 1;
    cur.qty += r.qty;
    if (r.packing_type === 'loose') {
      cur.loose += 1;
      cur.looseQty += r.qty;
    }
    byDestMap.set(key, cur);
  }
  // boxes per destination = unique box_no
  const boxKeyByDest = new Map<string, Set<string>>();
  for (const r of active) {
    if (r.packing_type !== 'boxed' || !r.box_no) continue;
    const set = boxKeyByDest.get(r.destination) ?? new Set();
    set.add(r.box_no);
    boxKeyByDest.set(r.destination, set);
  }
  for (const [dest, set] of boxKeyByDest.entries()) {
    const cur = byDestMap.get(dest);
    if (cur) cur.boxes = set.size;
  }
  const byDest = Array.from(byDestMap.values());

  const grand = active.reduce(
    (acc, r) => ({ items: acc.items + 1, qty: acc.qty + r.qty }),
    { items: 0, qty: 0 }
  );

  return { byBox, byDest, grand, merged, deleted: receipts.length - active.length };
}

function ReportDoc({
  receipts,
  language,
}: {
  receipts: BoxReceipt[];
  language: 'ar' | 'en';
}) {
  const { byBox, byDest, grand, merged, deleted } = aggregate(receipts);
  const ar = language === 'ar';
  const fmt = (n: number) => n.toLocaleString('en-US');
  const dest = (d: string) => DEST_LABEL[d]?.[language] ?? d;
  const today = new Date().toLocaleDateString('en-GB');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>
          {ar ? 'تقرير إجماليات الصناديق والوجهات' : 'Boxes & Destinations Totals Report'}
        </Text>
        <Text style={styles.sub}>
          {ar ? 'تاريخ التقرير: ' : 'Report date: '}
          {today}
        </Text>

        <View style={styles.section}>
          <Text style={styles.meta}>
            {ar ? 'سجلات نشطة: ' : 'Active records: '}
            {fmt(grand.items)} · {ar ? 'إجمالي الكمية: ' : 'Total Qty: '}
            {fmt(grand.qty)}
          </Text>
          <Text style={styles.meta}>
            {ar ? 'سجلات مدمجة: ' : 'Merged records: '}
            {fmt(merged)} · {ar ? 'إجمالي المحذوف: ' : 'Total deleted: '}
            {fmt(deleted)}
          </Text>
        </View>

        {/* By destination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {ar ? 'إجمالي حسب الوجهة' : 'Totals by Destination'}
          </Text>
          <View style={styles.row}>
            <Text style={[styles.th, { flex: 2 }]}>{ar ? 'الوجهة' : 'Destination'}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{ar ? 'صناديق' : 'Boxes'}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{ar ? 'سائبة' : 'Loose'}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{ar ? 'الأصناف' : 'Items'}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{ar ? 'الكمية' : 'Qty'}</Text>
          </View>
          {byDest.map((d) => (
            <View key={d.destination} style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>{dest(d.destination)}</Text>
              <Text style={[styles.td, styles.tdNum, { flex: 1 }]}>{fmt(d.boxes)}</Text>
              <Text style={[styles.td, styles.tdNum, { flex: 1 }]}>{fmt(d.loose)}</Text>
              <Text style={[styles.td, styles.tdNum, { flex: 1 }]}>{fmt(d.items)}</Text>
              <Text style={[styles.td, styles.tdNum, { flex: 1 }]}>{fmt(d.qty)}</Text>
            </View>
          ))}
        </View>

        {/* By box */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {ar ? 'إجمالي حسب الصندوق' : 'Totals by Box'}
          </Text>
          <View style={styles.row}>
            <Text style={[styles.th, { flex: 1 }]}>{ar ? 'الصندوق' : 'Box'}</Text>
            <Text style={[styles.th, { flex: 2 }]}>{ar ? 'الوجهة' : 'Destination'}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{ar ? 'الأصناف' : 'Items'}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{ar ? 'الكمية' : 'Qty'}</Text>
          </View>
          {byBox.map((b) => (
            <View key={b.box_no + b.destination} style={styles.row}>
              <Text style={[styles.td, { flex: 1 }]}>{b.box_no}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{dest(b.destination)}</Text>
              <Text style={[styles.td, styles.tdNum, { flex: 1 }]}>{fmt(b.items)}</Text>
              <Text style={[styles.td, styles.tdNum, { flex: 1 }]}>{fmt(b.qty)}</Text>
            </View>
          ))}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={[styles.td, { flex: 3 }]}>{ar ? 'الإجمالي' : 'Grand Total'}</Text>
            <Text style={[styles.td, styles.tdNum, { flex: 1 }]}>{fmt(grand.items)}</Text>
            <Text style={[styles.td, styles.tdNum, { flex: 1 }]}>{fmt(grand.qty)}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          DTS-Store · {today}
        </Text>
      </Page>
    </Document>
  );
}

export async function downloadBoxesTotalsPdf(receipts: BoxReceipt[], language: 'ar' | 'en') {
  const blob = await pdf(<ReportDoc receipts={receipts} language={language} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `boxes-totals-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}