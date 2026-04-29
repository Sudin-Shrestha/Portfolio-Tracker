const ENDPOINT =
  'https://merolagani.com/handlers/webrequesthandler.ashx?type=market_summary';

export interface NepseQuote {
  symbol: string;
  lastPrice: number;
  open: number;
  high: number;
  low: number;
  percentChange: number;
}

interface RawDetail {
  s?: string;
  lp?: number;
  op?: number;
  h?: number;
  l?: number;
  pc?: number;
}

interface RawResponse {
  mt?: string;
  turnover?: { date?: string; detail?: RawDetail[] };
}

export interface NepseSnapshot {
  date: string | null;
  quotes: Map<string, NepseQuote>;
}

export const fetchNepseSnapshot = async (): Promise<NepseSnapshot> => {
  const response = await fetch(ENDPOINT);
  if (!response.ok) {
    throw new Error(`NEPSE request failed: ${response.status}`);
  }
  const data = (await response.json()) as RawResponse;
  if (data.mt !== 'ok') {
    throw new Error('NEPSE response was not ok.');
  }
  const quotes = new Map<string, NepseQuote>();
  for (const row of data.turnover?.detail ?? []) {
    if (!row.s) continue;
    const symbol = String(row.s).toUpperCase();
    quotes.set(symbol, {
      symbol,
      lastPrice: Number(row.lp ?? 0),
      open: Number(row.op ?? 0),
      high: Number(row.h ?? 0),
      low: Number(row.l ?? 0),
      percentChange: Number(row.pc ?? 0),
    });
  }
  return { date: data.turnover?.date ?? null, quotes };
};
