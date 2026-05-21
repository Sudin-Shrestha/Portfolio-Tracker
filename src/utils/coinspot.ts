// CoinSpot sends no CORS headers, so we never call the host directly from the
// browser. In dev, Vite proxies "/coinspot" -> https://www.coinspot.com.au
// (see vite.config.ts). In production, set VITE_COINSPOT_BASE to your own proxy
// (e.g. a Firebase Function / Cloud Run that forwards to CoinSpot).
const BASE = (import.meta.env.VITE_COINSPOT_BASE ?? '/coinspot').replace(/\/$/, '');
const ENDPOINT = `${BASE}/charts/latestprice`;

interface CoinSpotResponse {
  s: string;
  price: number | string;
  open?: number | string;
  low?: number | string;
  high?: number | string;
}

/**
 * Resolve the CoinSpot ticker symbol from a portfolio row's asset name.
 * CoinSpot expects a bare ticker (e.g. BTC, ETH, SOL), uppercased.
 */
export const resolveSymbol = (asset: string): string | null => {
  const raw = (asset?.trim() ?? '').toUpperCase();
  return raw || null;
};

/**
 * Fetch the latest AUD price for a single symbol from CoinSpot.
 * Returns null when the symbol is unknown or the response is not "ok".
 */
export const fetchCoinSpotPrice = async (symbol: string): Promise<number | null> => {
  const url = `${ENDPOINT}?symbol=${encodeURIComponent(symbol)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinSpot request failed for ${symbol}: ${response.status}`);
  }
  const data = (await response.json()) as CoinSpotResponse;
  if (data.s !== 'ok') return null;
  const price = Number(data.price);
  return Number.isFinite(price) && price > 0 ? price : null;
};

/**
 * Fetch latest prices for a set of symbols in parallel.
 * CoinSpot only accepts one symbol per request, so we fan out and
 * tolerate individual failures (a bad symbol won't sink the batch).
 */
export const fetchCoinSpotPrices = async (
  symbols: string[],
): Promise<Record<string, number>> => {
  const unique = Array.from(new Set(symbols.filter(Boolean)));
  if (unique.length === 0) return {};

  const results = await Promise.allSettled(
    unique.map(async (symbol) => [symbol, await fetchCoinSpotPrice(symbol)] as const),
  );

  const out: Record<string, number> = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const [symbol, price] = result.value;
      if (price !== null) out[symbol] = price;
    }
  }
  return out;
};
