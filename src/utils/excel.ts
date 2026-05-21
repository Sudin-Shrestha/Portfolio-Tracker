import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { PortfolioRow, PortfolioState, TrackerType } from '../types';

const SHEET_NAMES: Record<TrackerType, string> = {
  crypto: 'Crypto',
  nepal: 'NEPSE',
};

const HEADERS = [
  'Asset Name',
  'Quantity',
  'Buy Price',
  'Current Price',
  'Total Value',
  'Profit/Loss',
] as const;

const toRowRecord = (row: PortfolioRow) => {
  const totalValue = row.quantity * row.currentPrice;
  const pnl = totalValue - row.quantity * row.buyPrice;
  return {
    'Asset Name': row.asset,
    Quantity: row.quantity,
    'Buy Price': row.buyPrice,
    'Current Price': row.currentPrice,
    'Total Value': Number(totalValue.toFixed(4)),
    'Profit/Loss': Number(pnl.toFixed(4)),
  };
};

const pickField = (row: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return undefined;
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseSheet = (sheet: XLSX.WorkSheet, tracker: TrackerType): PortfolioRow[] => {
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const rows: PortfolioRow[] = [];
  json.forEach((raw, index) => {
    const asset = String(
      pickField(raw, 'Asset Name', 'Asset', 'Coin', 'Stock', 'Name', 'Ticker') ?? '',
    ).trim();
    if (!asset) return;
    rows.push({
      id: `${tracker}-${Date.now()}-${index}`,
      asset,
      quantity: toNumber(pickField(raw, 'Quantity', 'Qty')),
      buyPrice: toNumber(pickField(raw, 'Buy Price', 'Avg Cost', 'Cost')),
      currentPrice: toNumber(pickField(raw, 'Current Price', 'Price', 'Market Price')),
    });
  });
  return rows;
};

export const readWorkbookFromFile = async (file: File): Promise<Partial<PortfolioState>> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const result: Partial<PortfolioState> = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const lower = sheetName.toLowerCase();
    if (lower.includes('crypto')) {
      result.crypto = parseSheet(sheet, 'crypto');
    } else if (
      lower.includes('nepse') ||
      lower.includes('nepal') ||
      lower.includes('share') ||
      lower.includes('stock')
    ) {
      result.nepal = parseSheet(sheet, 'nepal');
    }
  }

  return result;
};

export const buildWorkbook = (state: PortfolioState): XLSX.WorkBook => {
  const workbook = XLSX.utils.book_new();

  (Object.keys(SHEET_NAMES) as TrackerType[]).forEach((tracker) => {
    const records = state[tracker].map(toRowRecord);
    const sheet =
      records.length > 0
        ? XLSX.utils.json_to_sheet(records, { header: [...HEADERS] })
        : XLSX.utils.aoa_to_sheet([[...HEADERS]]);
    sheet['!cols'] = HEADERS.map((header) => ({
      wch: header === 'Asset Name' ? 22 : 14,
    }));
    XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAMES[tracker]);
  });

  return workbook;
};

export const downloadWorkbook = (state: PortfolioState, filename = 'portfolio.xlsx'): void => {
  const workbook = buildWorkbook(state);
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename);
};

export const sampleState: PortfolioState = {
  crypto: [
    {
      id: 'crypto-sample-1',
      asset: 'BTC',
      quantity: 0.35,
      buyPrice: 48000,
      currentPrice: 70500,
    },
    {
      id: 'crypto-sample-2',
      asset: 'ETH',
      quantity: 1.8,
      buyPrice: 2475,
      currentPrice: 4800,
    },
    {
      id: 'crypto-sample-3',
      asset: 'SOL',
      quantity: 14,
      buyPrice: 132,
      currentPrice: 217,
    },
  ],
  nepal: [
    {
      id: 'nepal-sample-1',
      asset: 'NABIL',
      quantity: 64,
      buyPrice: 970,
      currentPrice: 1010,
    },
    {
      id: 'nepal-sample-2',
      asset: 'HBL',
      quantity: 28,
      buyPrice: 375,
      currentPrice: 410,
    },
    {
      id: 'nepal-sample-3',
      asset: 'NRIC',
      quantity: 50,
      buyPrice: 720,
      currentPrice: 685,
    },
  ],
};
