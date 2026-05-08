import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export interface ParsedItem {
  rowIndex: number;
  part_no: string;
  description: string;
  qty: number | null;
  /** Image filenames inside the docx archive (word/media/...). */
  imageNames: string[];
  /** True when the same part_no appears more than once in the source file. */
  duplicateInFile?: boolean;
}

export interface ParsedDocx {
  items: ParsedItem[];
  /** filename -> Blob (image content) */
  images: Map<string, Blob>;
  /** Rows that look like data rows but had no detectable part number. */
  skipped: Array<{ reason: string; preview: string }>;
}

const NUM_RE = /^\d+$/;

function isPartNumber(value: string): boolean {
  const cleaned = value.replace(/\s+/g, '').toUpperCase();
  if (!cleaned || cleaned.length < 5 || cleaned.length > 40) return false;
  if (!/\d/.test(cleaned)) return false;
  if (!/^[A-Z0-9]+(?:[\/._-][A-Z0-9]+)*$/.test(cleaned)) return false;
  if (/^\d+$/.test(cleaned)) return cleaned.length >= 5 && cleaned.length <= 20;
  return /[A-Z]/.test(cleaned);
}

function mediaNameFromTarget(target: string): string {
  return target.replace(/^\.\.\//, '').split('/').pop() || target;
}

function flatText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flatText).join('');
  if (typeof node === 'object') {
    let out = '';
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'w:t' || k === ':t' || k === 't') {
        out += flatText(v);
      } else if (k.startsWith('@_') || k === '#text') {
        if (k === '#text') out += String(v);
      } else {
        out += flatText(v);
      }
    }
    return out;
  }
  return '';
}

function findEmbedRefs(node: unknown, out: string[]): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((n) => findEmbedRefs(n, out));
    return;
  }
  if (typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if ((k === 'a:blip' || k === 'blip') && v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      const embed = (obj['@_r:embed'] || obj['@_embed']) as string | undefined;
      if (embed) out.push(embed);
    }
    if ((k === 'v:imagedata' || k === 'imagedata') && v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      const embed = (obj['@_r:id'] || obj['@_id'] || obj['@_r:embed'] || obj['@_embed']) as string | undefined;
      if (embed) out.push(embed);
    }
    findEmbedRefs(v, out);
  }
}

function collectCells(row: unknown): unknown[] {
  if (!row || typeof row !== 'object') return [];
  const r = row as Record<string, unknown>;
  const tc = r['w:tc'] ?? r['tc'];
  if (!tc) return [];
  return Array.isArray(tc) ? tc : [tc];
}

function collectRows(tbl: unknown): unknown[] {
  if (!tbl || typeof tbl !== 'object') return [];
  const r = tbl as Record<string, unknown>;
  const tr = r['w:tr'] ?? r['tr'];
  if (!tr) return [];
  return Array.isArray(tr) ? tr : [tr];
}

function collectTables(node: unknown, out: unknown[]): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectTables(n, out));
    return;
  }
  if (typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === 'w:tbl' || k === 'tbl') {
      if (Array.isArray(v)) v.forEach((t) => out.push(t));
      else out.push(v);
    } else {
      collectTables(v, out);
    }
  }
}

/**
 * Parse a Word document (.docx) and extract a flat list of part rows.
 * Heuristics:
 *  - Look at every cell in every row of every table.
 *  - A "data row" is one that contains a cell whose text is purely 8-14 digits
 *    (the part number).
 *  - Description = the longest non-numeric, non-header cell.
 *  - Quantity   = the last short numeric cell that isn't the part number.
 *  - Images     = every <a:blip r:embed=".."/> inside any cell of that row.
 */
export async function parseDocxItems(file: File | Blob): Promise<ParsedDocx> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // 1. relationships → rId → media path
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');
  if (!relsXml) throw new Error('Document missing word/_rels/document.xml.rels');
  const relParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const relsDoc = relParser.parse(relsXml);
  const relMap = new Map<string, string>();
  const rels = (relsDoc?.Relationships?.Relationship ?? []) as
    | Array<Record<string, string>>
    | Record<string, string>;
  const relList = Array.isArray(rels) ? rels : [rels];
  for (const r of relList) {
    const id = r['@_Id'];
    const target = r['@_Target'];
    if (id && target) relMap.set(id, target);
  }

  // 2. images
  const images = new Map<string, Blob>();
  const mediaFolder = zip.folder('word/media');
  if (mediaFolder) {
    const tasks: Promise<void>[] = [];
    mediaFolder.forEach((relPath, fileObj) => {
      if (fileObj.dir) return;
      tasks.push(
        fileObj.async('blob').then((b) => {
          const name = relPath.split('/').pop() || relPath;
          // best-effort mime by extension
          const ext = (name.split('.').pop() || '').toLowerCase();
          const mime =
            ext === 'png' ? 'image/png' :
            ext === 'gif' ? 'image/gif' :
            ext === 'webp' ? 'image/webp' :
            ext === 'bmp' ? 'image/bmp' :
            'image/jpeg';
          images.set(name, new Blob([b], { type: mime }));
        })
      );
    });
    await Promise.all(tasks);
  }

  // 3. document.xml
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new Error('Document missing word/document.xml');
  const docParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    preserveOrder: false,
    parseAttributeValue: false,
    trimValues: true,
  });
  const doc = docParser.parse(docXml);

  // 4. walk tables
  const tables: unknown[] = [];
  collectTables(doc, tables);

  const items: ParsedItem[] = [];
  const skipped: Array<{ reason: string; preview: string }> = [];
  const partCounts = new Map<string, number>();
  let rowIdx = 0;

  for (const tbl of tables) {
    for (const tr of collectRows(tbl)) {
      rowIdx++;
      const cells = collectCells(tr);
      if (cells.length === 0) continue;

      const cellTexts = cells.map((c) => flatText(c).replace(/\s+/g, ' ').trim());
      const cellRefs: string[][] = cells.map((c) => {
        const refs: string[] = [];
        findEmbedRefs(c, refs);
        return refs;
      });

      // detect part number
      let partNo: string | null = null;
      let partIdx = -1;
      for (let i = 0; i < cellTexts.length; i++) {
        const cleaned = cellTexts[i].replace(/\s+/g, '').toUpperCase();
        if (PART_NO_RE.test(cleaned)) {
          partNo = cleaned;
          partIdx = i;
          break;
        }
      }
      if (!partNo) continue;

      // description = longest non-numeric, non-header cell
      let description = '';
      for (let i = 0; i < cellTexts.length; i++) {
        if (i === partIdx) continue;
        const t = cellTexts[i];
        if (!t) continue;
        const clean = t.replace(/\s+/g, '');
        if (NUM_RE.test(clean)) continue;
        const upper = t.toUpperCase();
        if (
          upper.includes('PART NUMBER') ||
          upper.includes('DESCRIPTION') ||
          upper.includes('IMAGE') ||
          upper.includes('QTY')
        ) {
          continue;
        }
        if (t.length < 3) continue;
        if (t.length > description.length) description = t;
      }

      // qty = last short numeric cell that isn't the part_no
      let qty: number | null = null;
      for (let i = cellTexts.length - 1; i >= 0; i--) {
        const clean = cellTexts[i].replace(/\s+/g, '');
        if (
          clean &&
          NUM_RE.test(clean) &&
          clean !== partNo &&
          clean.length <= 4
        ) {
          qty = parseInt(clean, 10);
          break;
        }
      }

      // image names from rels
      const refs = cellRefs.flat();
      const imageNames: string[] = [];
      for (const rid of refs) {
        const tgt = relMap.get(rid);
        if (!tgt) continue;
        const name = tgt.split('/').pop()!;
        if (!imageNames.includes(name)) imageNames.push(name);
      }

      partCounts.set(partNo, (partCounts.get(partNo) ?? 0) + 1);
      items.push({
        rowIndex: rowIdx,
        part_no: partNo,
        description,
        qty,
        imageNames,
      });
    }
  }

  // Flag rows whose part_no appears more than once in the file.
  for (const it of items) {
    if ((partCounts.get(it.part_no) ?? 0) > 1) it.duplicateInFile = true;
  }

  // Items with no description still kept but flagged in summary by caller.
  return { items, images, skipped };
}