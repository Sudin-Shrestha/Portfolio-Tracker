const ENDPOINT = 'https://api.coingecko.com/api/v3/simple/price';

const KNOWN_IDS: Record<string, string> = {
  btc: 'bitcoin',
  bitcoin: 'bitcoin',
  eth: 'ethereum',
  ethereum: 'ethereum',
  sol: 'solana',
  solana: 'solana',
  ada: 'cardano',
  cardano: 'cardano',
  bnb: 'binancecoin',
  xrp: 'ripple',
  doge: 'dogecoin',
  dot: 'polkadot',
  matic: 'matic-network',
  avax: 'avalanche-2',
  ltc: 'litecoin',
  link: 'chainlink',
  trx: 'tron',
  atom: 'cosmos',
  near: 'near',
  uni: 'uniswap',
};

export const resolveCoinId = (asset: string, override?: string): string | null => {
  if (override?.trim()) return override.trim().toLowerCase();
  const lower = asset.trim().toLowerCase();
  if (!lower) return null;
  return KNOWN_IDS[lower] ?? lower;
};

export const fetchPrices = async (
  ids: string[],
  currency = 'aud',
): Promise<Record<string, number>> => {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};

  const url = `${ENDPOINT}?ids=${encodeURIComponent(unique.join(','))}&vs_currencies=${currency}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko request failed: ${response.status}`);
  }
  const data = (await response.json()) as Record<string, Record<string, number>>;
  const out: Record<string, number> = {};
  for (const id of unique) {
    const price = data[id]?.[currency];
    if (typeof price === 'number') out[id] = price;
  }
  return out;
};
