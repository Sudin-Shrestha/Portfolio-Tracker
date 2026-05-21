import { useEffect, useMemo, useRef, useState } from 'react';
import { Transaction } from '../types';
import {
  copyExport,
  downloadExport,
  ExportFormat,
  listAvailableMonths,
  MonthKey,
} from '../utils/exportTransactions';

interface Props {
  transactions: Transaction[];
  initialMonth?: MonthKey;
  // Visual style — analytics page sits next to a select, tracker sits in a summary bar
  variant?: 'primary' | 'ghost';
  label?: string;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; hint: string }[] = [
  { value: 'ai', label: 'AI Review (Markdown)', hint: 'Paste into ChatGPT / Claude / Gemini' },
  { value: 'csv', label: 'CSV', hint: 'Open in Excel or Sheets' },
  { value: 'json', label: 'JSON', hint: 'Raw structured data' },
];

export const TransactionExportMenu = ({
  transactions,
  initialMonth = 'all',
  variant = 'primary',
  label = 'Export',
}: Props) => {
  const [open, setOpen] = useState(false);
  const [monthKey, setMonthKey] = useState<MonthKey>(initialMonth);
  const [format, setFormat] = useState<ExportFormat>('ai');
  const [toast, setToast] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const months = useMemo(() => listAvailableMonths(transactions), [transactions]);

  // Keep selection valid if the underlying data changes
  useEffect(() => {
    if (!months.find((m) => m.key === monthKey)) {
      setMonthKey('all');
    }
  }, [months, monthKey]);

  // Sync when parent changes initialMonth (e.g. user picks a month on Analytics)
  useEffect(() => {
    setMonthKey(initialMonth);
  }, [initialMonth]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleDownload = () => {
    if (transactions.length === 0) {
      flash('No transactions to export');
      return;
    }
    downloadExport(transactions, monthKey, format);
    flash('Download started');
  };

  const handleCopy = async () => {
    if (transactions.length === 0) {
      flash('No transactions to export');
      return;
    }
    const ok = await copyExport(transactions, monthKey, format);
    flash(ok ? 'Copied to clipboard' : 'Copy failed — try Download');
  };

  const buttonClass = variant === 'ghost' ? 'button button--ghost' : 'button';

  return (
    <div className="tx-export-wrap" ref={popoverRef}>
      <button
        type="button"
        className={`${buttonClass} tx-export-toggle`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        ⇩ {label}
      </button>

      {open && (
        <div className="tx-export-popover" role="dialog" aria-label="Export transactions">
          <div className="tx-export-row">
            <label className="tx-filter-label" htmlFor="export-month">Month</label>
            <select
              id="export-month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
            >
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tx-export-row">
            <span className="tx-filter-label">Format</span>
            <div className="tx-export-formats">
              {FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`tx-export-format ${format === opt.value ? 'is-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="export-format"
                    value={opt.value}
                    checked={format === opt.value}
                    onChange={() => setFormat(opt.value)}
                  />
                  <span>
                    <strong>{opt.label}</strong>
                    <small className="muted">{opt.hint}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="tx-export-actions">
            <button type="button" className="button button--ghost" onClick={handleCopy}>
              Copy
            </button>
            <button type="button" className="button" onClick={handleDownload}>
              Download
            </button>
          </div>

          {toast && <div className="tx-export-toast">{toast}</div>}
        </div>
      )}
    </div>
  );
};
