import { useState } from 'react';
import type { Dataset } from '../lib/types';
import { formatNumber, formatCell } from '../lib/operations';
import { Badge } from '../components/ui';
export function Overview({ dataset }: { dataset: Dataset }) {
  const [query, setQuery] = useState(''),
    profiles = dataset.profile.columnProfiles.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase()),
    );
  return (
    <>
      <div className="overview-grid">
        <section className="card health-card">
          <p className="eyebrow">DATA AT A GLANCE</p>
          <h2>A clear starting point</h2>
          <div className="completeness">
            <strong>{dataset.profile.completeness}%</strong>
            <span>of cells contain a value</span>
          </div>
          <div className="progress-track">
            <div style={{ width: dataset.profile.completeness + '%' }} />
          </div>
          <p>
            Missing values and repeated rows are useful signals. Review them before deciding what to
            remove.
          </p>
          <div className="health-line">
            <span>Rows with missing values</span>
            <strong>{formatNumber(dataset.profile.rowsWithMissing)}</strong>
          </div>
          <div className="health-line">
            <span>Repeated rows after the first</span>
            <strong>{formatNumber(dataset.profile.duplicateRows)}</strong>
          </div>
        </section>
        <section className="card quick-insight">
          <p className="eyebrow">YOUR IMPORT</p>
          <h2>Keep the original. Work with confidence.</h2>
          <p>
            The original dataset stays untouched. Cleaning steps apply to a separate working
            version, and undo rebuilds the previous result.
          </p>
          <div className="import-detail">
            <span>Source</span>
            <strong>
              {dataset.source.sample ? 'Fictional sample' : 'Your upload'} · {dataset.source.format}
            </strong>
          </div>
          {dataset.source.sheet && (
            <div className="import-detail">
              <span>Worksheet</span>
              <strong>{dataset.source.sheet}</strong>
            </div>
          )}
          <div className="import-detail">
            <span>Original shape</span>
            <strong>
              {dataset.originalProfile.rows} rows × {dataset.originalProfile.columns} columns
            </strong>
          </div>
          <div className="import-detail">
            <span>Working data memory</span>
            <strong>{(dataset.profile.memoryBytes / 1024).toFixed(1)} KB</strong>
          </div>
        </section>
      </div>
      <div className="section-heading">
        <div>
          <h2>Know your columns</h2>
          <p>Inferred types, missing values, and useful summaries.</p>
        </div>
        <input
          className="column-search"
          aria-label="Search columns"
          placeholder="Find a column…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="column-grid">
        {profiles.map((column) => (
          <article className="card column-card" key={column.name}>
            <div className="column-title">
              <h3 title={column.name}>{column.name}</h3>
              <Badge
                tone={
                  ['integer', 'decimal'].includes(column.type)
                    ? 'purple'
                    : column.type === 'date'
                      ? 'blue'
                      : 'neutral'
                }
              >
                {column.type}
              </Badge>
            </div>
            <div className="column-numbers">
              <div>
                <span>Missing</span>
                <strong>{column.missing}</strong>
              </div>
              <div>
                <span>Unique values</span>
                <strong>{column.unique}</strong>
              </div>
              <div>
                <span>Populated</span>
                <strong>{dataset.profile.rows - column.missing}</strong>
              </div>
            </div>
            {column.stats ? (
              <>
                <p className="summary-label">NUMERIC SUMMARY</p>
                <div className="numeric-summary">
                  {(['min', 'max', 'mean', 'median', 'std'] as const).map((key) => (
                    <div key={key}>
                      <span>
                        {key === 'std'
                          ? 'Std. deviation'
                          : key === 'min'
                            ? 'Minimum'
                            : key === 'max'
                              ? 'Maximum'
                              : key.charAt(0).toUpperCase() + key.slice(1)}
                      </span>
                      <strong>{formatNumber(column.stats![key])}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="summary-label">MOST COMMON VALUES</p>
                <div className="value-list">
                  {column.topValues.slice(0, 4).map((v, n) => (
                    <div key={n}>
                      <span title={formatCell(v.value)}>{formatCell(v.value)}</span>
                      <strong>{v.count}</strong>
                    </div>
                  ))}
                  {!column.topValues.length && (
                    <p className="small">This column contains only missing values.</p>
                  )}
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      {!profiles.length && <p className="empty">No columns match this search.</p>}
    </>
  );
}
