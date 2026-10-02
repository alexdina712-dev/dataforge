import type { Preview } from '../lib/types';
import { formatCell } from '../lib/operations';
export function DataTable({ data, compact = false }: { data: Preview; compact?: boolean }) {
  return (
    <div className={'table-wrap ' + (compact ? 'compact-table' : '')}>
      <table>
        <thead>
          <tr>
            <th className="row-number">#</th>
            {data.columns.map((c) => (
              <th key={c} title={c}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, n) => (
            <tr key={n}>
              <td className="row-number">{data.offset + n + 1}</td>
              {row.map((v, i) => (
                <td key={i} className={v === null ? 'missing-cell' : ''}>
                  <span title={v === null ? 'Missing value' : formatCell(v)}>{formatCell(v)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!data.rows.length && <p className="empty-table">No rows remain in this version.</p>}
    </div>
  );
}
