import { useMemo, useState } from 'react';
import { Candle } from '../types';

interface CandlestickChartProps {
  candles: Candle[];
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
  width = 960,
  height = 420,
}: CandlestickChartProps) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (candles.length === 0) return null;
    const innerW = width - PADDING.left - PADDING.right;
    const innerH = height - PADDING.top - PADDING.bottom;

    const min = Math.min(...candles.map((c) => c.low));
    const max = Math.max(...candles.map((c) => c.high));
    const padPrice = (max - min) * 0.05 || 1;
    const yMin = min - padPrice;
    const yMax = max + padPrice;
    const yRange = yMax - yMin || 1;

    const slot = innerW / candles.length;
    const bodyWidth = Math.max(2, Math.min(slot * 0.7, 14));

    const yToPx = (price: number) =>
      PADDING.top + ((yMax - price) / yRange) * innerH;

    const xToPx = (idx: number) => PADDING.left + slot * idx + slot / 2;

    const ticks = 5;
    const yTicks = Array.from({ length: ticks }, (_, i) => {
      const value = yMin + (yRange * i) / (ticks - 1);
      return { value, y: yToPx(value) };
    });

    const xTickIndices = Array.from({ length: 5 }, (_, i) =>
      Math.min(candles.length - 1, Math.round(((candles.length - 1) * i) / 4)),
    );

    return { innerW, innerH, yToPx, xToPx, slot, bodyWidth, yTicks, xTickIndices };
  }, [candles, width, height]);

  if (!chart) return null;

  const hovered = hoverIndex !== null ? candles[hoverIndex] : null;

  return (
    <div className="candle-chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="candle-chart"
        role="img"
        aria-label="XAU/USD candlestick chart"
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
