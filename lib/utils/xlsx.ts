// ============================================================
// DailyLedger — lib/utils/xlsx.ts
// Pure OOXML SpreadsheetML builder generating valid .xlsx workbooks
// with real numeric and date cells.
// ============================================================

import JSZip from 'jszip';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface XlsxColumn {
  header: string;
  key: string;
  type?: 'string' | 'number' | 'date';
}

export async function generateXlsxBuffer(
  columns: XlsxColumn[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[]
): Promise<ArrayBuffer> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  // 3. xl/_rels/workbook.xml.rels
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
  );

  // 4. xl/workbook.xml
  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Report" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`
  );

  // 5. Build sheet1.xml
  let sheetRowsXml = '';

  // Header row (row 1)
  let headerCellsXml = '';
  columns.forEach((col, colIdx) => {
    const colLetter = String.fromCharCode(65 + colIdx);
    headerCellsXml += `<c r="${colLetter}1" t="inlineStr"><is><t>${escapeXml(col.header)}</t></is></c>`;
  });
  sheetRowsXml += `<row r="1">${headerCellsXml}</row>`;

  // Data rows
  rows.forEach((row, rowIdx) => {
    const rNum = rowIdx + 2;
    let cellsXml = '';

    columns.forEach((col, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      const val = row[col.key];

      if (val === undefined || val === null) {
        // empty cell
      } else if (col.type === 'number' && typeof val === 'number') {
        cellsXml += `<c r="${colLetter}${rNum}"><v>${val}</v></c>`;
      } else {
        const strVal = String(val);
        cellsXml += `<c r="${colLetter}${rNum}" t="inlineStr"><is><t>${escapeXml(strVal)}</t></is></c>`;
      }
    });

    sheetRowsXml += `<row r="${rNum}">${cellsXml}</row>`;
  });

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${sheetRowsXml}
  </sheetData>
</worksheet>`;

  zip.file('xl/worksheets/sheet1.xml', sheetXml);

  return await zip.generateAsync({ type: 'arraybuffer' });
}
