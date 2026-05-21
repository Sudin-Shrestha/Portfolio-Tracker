import { Candle } from '../types';

// Replicates "Zero-Lag MA Trend Levels [ChartPrime]" (Pine v5):
//   emaValue   = ta.ema(close, length)
//   correction = close + (close - emaValue)
//   zlma       = ta.ema(correction, length)
//   signalUp   = ta.crossover(zlma, emaValue)
//   signalDn   = ta.crossunder(zlma, emaValue)
// Trend levels are drawn as ATR(200)-tall boxes anchored at each signal.

export type TrendDir = 'up' | 'dn';

export interface ZlmaSignal {
  index: number;
  type: TrendDir;
  time: number;
  zlma: number;
  close: number;
}

export interface TrendBox {
  startIndex: number;
  endIndex: number;
  top: number;
  bottom: number;
  type: TrendDir;
  price: number;
}

export interface ZlmaTrend {
  ema: number[];
  zlma: number[];
  atr: number[];
  signals: ZlmaSignal[];
  boxes: TrendBox[];
}

// Pine ta.ema: alpha = 2/(length+1), seeded with the first source value.
const ema = (values: number[], length: number): number[] => {
  const alpha = 2 / (length + 1);
  const out: number[] = new Array(values.length);
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i += 1) {
    prev = i === 0 ? values[i] : alpha * values[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
};

// Pine ta.atr: RMA (Wilder) smoothing of True Range, alpha = 1/length.
const atrRma = (candles: Candle[], length: number): number[] => {
  const alpha = 1 / length;
  const out: number[] = new Array(candles.length);
  let prev = 0;
  for (let i = 0; i < candles.length; i += 1) {
    const c = candles[i];
    const tr =
      i === 0
        ? c.high - c.low
        : Math.max(
            c.high - c.low,
            Math.abs(c.high - candles[i - 1].close),
            Math.abs(c.low - candles[i - 1].close),
          );
    prev = i === 0 ? tr : alpha * tr + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
};

export const computeZlmaTrend = (
  candles: Candle[],
  length = 15,
  atrLength = 200,
): ZlmaTrend => {
  if (candles.length === 0) {
    return { ema: [], zlma: [], atr: [], signals: [], boxes: [] };
  }

  const close = candles.map((c) => c.close);
  const emaValue = ema(close, length);
  const correction = close.map((c, i) => c + (c - emaValue[i]));
  const zlma = ema(correction, length);
  const atr = atrRma(candles, atrLength);

  const signals: ZlmaSignal[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const crossUp = zlma[i - 1] <= emaValue[i - 1] && zlma[i] > emaValue[i];
    const crossDn = zlma[i - 1] >= emaValue[i - 1] && zlma[i] < emaValue[i];
    if (crossUp || crossDn) {
      signals.push({
        index: i,
        type: crossUp ? 'up' : 'dn',
        time: candles[i].time,
        zlma: zlma[i],
        close: candles[i].close,
      });
    }
  }

  // Each signal opens a trend-level box that extends right until the next signal.
  const boxes: TrendBox[] = signals.map((s, k) => {
    const endIndex = k + 1 < signals.length ? signals[k + 1].index : candles.length - 1;
    const a = atr[s.index];
    return s.type === 'up'
      ? { startIndex: s.index, endIndex, top: s.zlma, bottom: s.zlma - a, type: 'up', price: s.close }
      : { startIndex: s.index, endIndex, top: s.zlma + a, bottom: s.zlma, type: 'dn', price: s.close };
  });

  return { ema: emaValue, zlma, atr, signals, boxes };
};
