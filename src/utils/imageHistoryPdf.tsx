import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { ItemImageHistoryEntry } from '@/hooks/useItemImageHistory';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, color: '#1f2937', fontFamily: 'Helvetica' },
  header: { marginBottom: 14, borderBottom: '1pt solid #e5e7eb', paddingBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  meta: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  row: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #e5e7eb',
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  cellAction: { width: '12%', paddingRight: 4 },
  cellWho: { width: '20%', paddingRight: 4 },
  cellThumbs: { width: '38%', flexDirection: 'row', gap: 6 },
  cellNotes: { width: '30%', paddingLeft: 4 },
  badge: {
    fontSize: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    alignSelf: 'flex-start',
  },
  date: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  user: { fontSize: 9, fontWeight: 'bold' },
  thumbBox: { width: 56, alignItems: 'center' },
  thumbImg: { width: 56, height: 56, objectFit: 'contain', borderRadius: 2 },
  thumbLabel: { fontSize: 7, color: '#6b7280', marginTop: 2 },
  partNo: { fontSize: 8, color: '#374151', fontFamily: 'Courier' },
  notes: { fontSize: 8, color: '#374151' },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
  },
  empty: { fontSize: 9, color: '#6b7280', textAlign: 'center', paddingVertical: 24 },
});

function pathToUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from('box-images').getPublicUrl(path).data.publicUrl;
}

/** Pre-fetch images as data URLs so react-pdf can render them reliably. */
async function urlToDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface PreparedRow {
  entry: ItemImageHistoryEntry;
  prevData: string | null;
  newData: string | null;
}

function ReportDocument({
  rows,
  title,
  subtitle,
}: {
  rows: PreparedRow[];
  title: string;
  subtitle: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>{subtitle}</Text>
        </View>
        {rows.length === 0 ? (
          <Text style={styles.empty}>No entries</Text>
        ) : (
          rows.map(({ entry, prevData, newData }) => (
            <View key={entry.id} style={styles.row} wrap={false}>
              <View style={styles.cellAction}>
                <Text style={styles.badge}>{entry.action.toUpperCase()}</Text>
                <Text style={styles.date}>
                  {format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm')}
                </Text>
              </View>
              <View style={styles.cellWho}>
                <Text style={styles.user}>{entry.changed_by_username || '—'}</Text>
                {entry.item_part_no && <Text style={styles.partNo}>{entry.item_part_no}</Text>}
              </View>
              <View style={styles.cellThumbs}>
                {prevData && (
                  <View style={styles.thumbBox}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image src={prevData} style={styles.thumbImg} />
                    <Text style={styles.thumbLabel}>Before</Text>
                  </View>
                )}
                {newData && (
                  <View style={styles.thumbBox}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image src={newData} style={styles.thumbImg} />
                    <Text style={styles.thumbLabel}>After</Text>
                  </View>
                )}
              </View>
              <View style={styles.cellNotes}>
                {entry.notes ? <Text style={styles.notes}>{entry.notes}</Text> : null}
                {entry.new_path && (
                  <Text style={styles.partNo}>{entry.new_path.split('/').pop()}</Text>
                )}
              </View>
            </View>
          ))
        )}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

/**
 * Generates a PDF summary of the filtered image-history rows and triggers
 * a browser download. Images are embedded inline (before/after when both
 * are available). Limits the rendered rows to keep the PDF responsive.
 */
export async function exportImageHistoryPdf(
  entries: ItemImageHistoryEntry[],
  opts: { title: string; subtitle: string; fileName?: string; maxRows?: number } = {
    title: 'Image History',
    subtitle: '',
  },
) {
  const max = opts.maxRows ?? 80;
  const sliced = entries.slice(0, max);
  const prepared: PreparedRow[] = await Promise.all(
    sliced.map(async (entry) => {
      const [prevData, newData] = await Promise.all([
        urlToDataUrl(pathToUrl(entry.old_path)),
        urlToDataUrl(pathToUrl(entry.new_path)),
      ]);
      return { entry, prevData, newData };
    }),
  );

  const doc = (
    <ReportDocument
      rows={prepared}
      title={opts.title}
      subtitle={`${opts.subtitle} · ${entries.length} entries${
        entries.length > max ? ` (showing first ${max})` : ''
      }`}
    />
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = format(new Date(), 'yyyyMMdd_HHmmss');
  a.href = url;
  a.download = opts.fileName ?? `image_history_${stamp}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}