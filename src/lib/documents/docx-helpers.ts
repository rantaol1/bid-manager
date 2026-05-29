import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx'

export const BRAND = {
  magenta: 'E6007E',
  black: '1A1A1A',
  grey: 'F2F2F2',
  white: 'FFFFFF',
}

/** Branded document base — Arial throughout, magenta H1, black H2. */
export function brandedDocument(children: (Paragraph | Table)[]): Document {
  return new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 32, bold: true, font: 'Arial', color: BRAND.magenta },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 26, bold: true, font: 'Arial', color: BRAND.black },
          paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [{ properties: {}, children }],
  })
}

export function h1(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1 })
}

export function h2(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 })
}

export function p(text: string, opts?: { bold?: boolean; size?: number; color?: string }) {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts?.bold, size: opts?.size, color: opts?.color })],
    spacing: { after: 120 },
  })
}

export function bullets(items: string[]) {
  return items.map((text) => new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 60 } }))
}

const NO_BORDER = { style: BorderStyle.SINGLE, size: 2, color: 'D9D9D9' }

function cell(text: string, widthDxa: number, opts?: { header?: boolean; align?: typeof AlignmentType.RIGHT }) {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    shading: opts?.header
      ? { type: ShadingType.CLEAR, fill: BRAND.magenta, color: 'auto' }
      : { type: ShadingType.CLEAR, fill: BRAND.white, color: 'auto' },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: opts?.align,
        children: [
          new TextRun({
            text,
            bold: opts?.header,
            color: opts?.header ? BRAND.white : BRAND.black,
            font: 'Arial',
            size: 20,
          }),
        ],
      }),
    ],
  })
}

export interface TableColumn {
  header: string
  width: number // DXA
  align?: 'right'
}

/** Build a branded table. columnWidths set on the table AND width on each cell (per §7.1). */
export function brandedTable(columns: TableColumn[], rows: string[][]): Table {
  const widths = columns.map((c) => c.width)
  const headerRow = new TableRow({
    tableHeader: true,
    children: columns.map((c) =>
      cell(c.header, c.width, { header: true, align: c.align === 'right' ? AlignmentType.RIGHT : undefined })
    ),
  })
  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((value, i) =>
          cell(value, columns[i].width, {
            align: columns[i].align === 'right' ? AlignmentType.RIGHT : undefined,
          })
        ),
      })
  )

  return new Table({
    columnWidths: widths,
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [headerRow, ...bodyRows],
  })
}

export function coverParagraphs(title: string, customer: string, dateStr: string, version: string) {
  return [
    new Paragraph({ spacing: { before: 1200 } }),
    new Paragraph({
      children: [new TextRun({ text: 'ARCWIDE', bold: true, size: 48, color: BRAND.magenta, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 40, color: BRAND.black, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: customer, size: 28, color: BRAND.black, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `${dateStr}  ·  ${version}`, size: 22, color: '666666', font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    }),
  ]
}
