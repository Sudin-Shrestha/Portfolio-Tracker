import { useMemo, useState } from 'react';
import { Candle } from '../types';
import { TrendBox, TrendDir, ZlmaSignal } from '../utils/zlmaTrend';

export interface ChartOverlay {
  zlma: number[];
  ema: number[];
  signals: ZlmaSignal[];
  boxes: TrendBox[];
  upColor: string;
  dnColor: string;
}

interface CandlestickChartProps {
  candles: Candle[];
  overlay?: ChartOverlay;
  width?: number;
  height?: number;
}

const PADDING = { top: 16, right: 64, bottom: 28, left: 12 };

const formatPrice = (value: number): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const formatDateTime = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const CandlestickChart = ({
  candles,
  overlay,
  width = 960,
  height = 420,
}: CandlestickChartProps) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (candles.length === 0) return null;
    const innerW = width - PADDING.left - PADDING.right;
    const innerH = height - PADDING.top - PADDING.bottom;

    let min = Math.min(...candles.map((c) => c.low));
    let max = Math.max(...candles.map((c) => c.high));
    if (overlay) {
      const extra = [
        ...overlay.zlma,
        ...overlay.ema,
        ...overlay.boxes.flatMap((b) => [b.top, b.bottom]),
      ].filter((v) => Number.isFinite(v));
      if (extra.length) {
        min = Math.min(min, ...extra);
        max = Math.max(max, ...extra);
      }
    }
    const padPrice = (max - min) * 0.05 || 1;
    const yMin = min - padPrice;
    const yMax = max + padPrice;
    const yRange = yMax - yMin || 1;

    const slot = innerW / candles.length;
    const bodyWidth = Math.max(2, Math.min(slot * 0.7, 14));

    const yToPx = (price: number) => PADDING.top + ((yMax - price) / yRange) * innerH;
    const xToPx = (idx: number) => PADDING.left + slot * idx + slot / 2;

    const ticks = 5;
    const yTicks = Array.from({ length: ticks }, (_, i) => {
      const value = yMin + (yRange * i) / (ticks - 1);
      return { value, y: yToPx(value) };
    });

    const xTickIndices = Array.from({ length: 5 }, (_, i) =>
      Math.min(candles.length - 1, Math.round(((candles.length - 1) * i) / 4)),
    );

    // --- Indicator overlay geometry -------------------------------------
    let overlayGeom = null as null | {
      bands: { color: string; d: string }[];
      lines: { color: string; pts: string }[];
      diamonds: { x: number; y: number; type: TrendDir }[];
      boxes: { x: number; y: number; w: number; h: number; type: TrendDir; price: number }[];
    };

    if (overlay && overlay.zlma.length === candles.length) {
      const { zlma, ema, upColor, dnColor } = overlay;
      const colorOf = (dir: TrendDir) => (dir === 'up' ? upColor : dnColor);

      // Contiguous runs where ZLMA stays on the same side of EMA.
      const runs: { dir: TrendDir; start: number; end: number }[] = [];
      for (let i = 0; i < candles.length; i += 1) {
        const dir: TrendDir = zlma[i] >= ema[i] ? 'up' : 'dn';
        const last = runs[runs.length - 1];
        if (!last || last.dir !== dir) runs.push({ dir, start: i, end: i });
        else last.end = i;
      }

      const bands = runs.map((run) => {
        const top: string[] = [];
        const bottom: string[] = [];
        for (let i = run.start; i <= run.end; i += 1) {
          top.push(`${xToPx(i)},${yToPx(zlma[i])}`);
          bottom.push(`${xToPx(i)},${yToPx(ema[i])}`);
        }
        bottom.reverse();
        return { color: colorOf(run.dir), d: `M${[...top, ...bottom].join(' L')} Z` };
      });

      const lineRun = (series: number[], run: { dir: TrendDir; start: number; end: number }) => {
        const from = run.start > 0 ? run.start - 1 : run.start; // connect across colour change
        const pts: string[] = [];
        for (let i = from; i <= run.end; i += 1) pts.push(`${xToPx(i)},${yToPx(series[i])}`);
        return { color: colorOf(run.dir), pts: pts.join(' ') };
      };
      const lines = [
        ...runs.map((r) => lineRun(ema, r)),
        ...runs.map((r) => lineRun(zlma, r)),
      ];

      const diamonds = overlay.signals.map((s) => ({
        x: xToPx(s.index),
        y: yToPx(zlma[s.index]),
        type: s.type,
      }));

      const boxes = overlay.boxes.map((b) => {
        const x = xToPx(b.startIndex) - slot / 2;
        const right = xToPx(b.endIndex) + slot / 2;
        return {
          x,
          y: yToPx(b.top),
          w: Math.max(1, right - x),
          h: Math.max(1, yToPx(b.bottom) - yToPx(b.top)),
          type: b.type,
          price: b.price,
        };
      });

      overlayGeom = { bands, lines, diamonds, boxes };
    }

    return {
      innerW,
      innerH,
      yToPx,
      xToPx,
      slot,
      bodyWidth,
      yTicks,
      xTickIndices,
      overlayGeom,
    };
  }, [candles, width, height, overlay]);

  if (!chart) return null;

  const hovered = hoverIndex !== null ? candles[hoverIndex] : null;
  const geom = chart.overlayGeom;

  return (
    <div className="candle-chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="candle-chart"
        role="img"
        aria-label="XAU/USD candlestick chart with Zero-Lag MA trend levels"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {chart.yTicks.map((tick, i) => (
          <g key={`y-${i}`}>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={tick.y}
              y2={tick.y}
              className="candle-grid"
            />
            <text
              x={width - PADDING.right + 6}
              y={tick.y + 4}
              className="candle-axis"
              textAnchor="start"
            >
              {formatPrice(tick.value)}
            </text>
          </g>
        ))}

        {chart.xTickIndices.map((idx) => (
          <text
            key={`x-${idx}`}
            x={chart.xToPx(idx)}
            y={height - PADDING.bottom + 18}
            textAnchor="middle"
            className="candle-axis"
          >
            {formatDate(candles[idx].time)}
          </text>
        ))}

        {/* Trend-level boxes sit behind the candles. */}
        {geom?.boxes.map((b, i) => (
          <g key={`box-${i}`}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill={b.type === 'up' ? overlay!.upColor : overlay!.dnColor}
              fillOpacity={0.1}
              stroke={b.type === 'up' ? overlay!.upColor : overlay!.dnColor}
              strokeOpacity={0.4}
              strokeWidth={1}
            />
            <text
              x={b.x + b.w - 4}
              y={b.y + 12}
              textAnchor="end"
              className="candle-axis"
              fill={b.type === 'up' ? overlay!.upColor : overlay!.dnColor}
            >
              {formatPrice(b.price)}
            </text>
          </g>
        ))}

        {candles.map((c, idx) => {
          const x = chart.xToPx(idx);
          const isUp = c.close >= c.open;
          const yOpen = chart.yToPx(c.open);
          const yClose = chart.yToPx(c.close);
          const yHigh = chart.yToPx(c.high);
          const yLow = chart.yToPx(c.low);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
          const cls = isUp ? 'candle--up' : 'candle--down';

          return (
            <g
              key={c.time}
              className={`candle ${cls}`}
              onMouseEnter={() => setHoverIndex(idx)}
            >
              <rect
                x={x - chart.slot / 2}
                y={PADDING.top}
                width={chart.slot}
                height={chart.innerH}
                fill="transparent"
              />
              <line x1={x} x2={x} y1={yHigh} y2={yLow} className="candle-wick" />
              <rect
                x={x - chart.bodyWidth / 2}
                y={bodyTop}
                width={chart.bodyWidth}
                height={bodyHeight}
                className="candle-body"
              />
            </g>
          );
        })}

        {/* ZLMA / EMA band fill + lines on top of candles. */}
        {geom?.bands.map((band, i) => (
          <path key={`band-${i}`} d={band.d} fill={band.color} fillOpacity={0.12} stroke="none" />
        ))}
        {geom?.lines.map((line, i) => (
          <polyline
            key={`line-${i}`}
            points={line.pts}
            fill="none"
            stroke={line.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ))}
        {geom?.diamonds.map((d, i) => {
          const s = 5;
          return (
            <polygon
              key={`sig-${i}`}
              points={`${d.x},${d.y - s} ${d.x + s},${d.y} ${d.x},${d.y + s} ${d.x - s},${d.y}`}
              fill={d.type === 'up' ? overlay!.upColor : overlay!.dnColor}
              stroke="var(--surface)"
              strokeWidth={1}
            />
          );
        })}

        {hoverIndex !== null && (
          <line
            x1={chart.xToPx(hoverIndex)}
            x2={chart.xToPx(hoverIndex)}
            y1={PADDING.top}
            y2={height - PADDING.bottom}
            className="candle-cursor"
          />
        )}
      </svg>

      {hovered && (
        <div className="candle-tooltip">
          <strong>{formatDateTime(hovered.time)}</strong>
          <span>O {formatPrice(hovered.open)}</span>
          <span>H {formatPrice(hovered.high)}</span>
          <span>L {formatPrice(hovered.low)}</span>
          <span className={hovered.close >= hovered.open ? 'positive' : 'negative'}>
            C {formatPrice(hovered.close)}
          </span>
        </div>
      )}
    </div>
  );
};
