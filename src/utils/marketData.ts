import { Candle, CandleInterval, SpotPrice } from '../types';

const BINANCE_KLINES = 'https://api.binance.com/api/v3/klines';
const GOLD_SPOT = 'https://api.gold-api.com/price/XAU';

const SYMBOL = 'PAXGUSDT';

export const fetchGoldCandles = async (
  interval: CandleInterval = '1d',
  limit = 120,
): Promise<Candle[]> => {
  const url = `${BINANCE_KLINES}?symbol=${SYMBOL}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Binance request failed: ${response.status}`);
  }
  const raw = (await response.json()) as unknown[][];
  return raw.map((row) => ({
    time: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
  }));
};

export const fetchSpotGold = async (): Promise<SpotPrice> => {
  const response = await fetch(GOLD_SPOT);
  if (!response.ok) {
    throw new Error(`Spot gold request failed: ${response.status}`);
  }
  const data = (await response.json()) as { price: number; updatedAt?: string };
  return {
    price: Number(data.price),
    updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now(),
  };
};
