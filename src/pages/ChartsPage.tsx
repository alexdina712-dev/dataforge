import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { api } from '../lib/api';
import type { Dataset, ChartData } from '../lib/types';
import { errorMessage } from '../lib/operations';
import { Chart } from '../components/Chart';
import { ErrorMessage, Empty, Badge } from '../components/ui';
export function ChartsPage({ dataset }: { dataset: Dataset }) {
  const [kind, setKind] = useState<ChartData['kind']>('bar'),
    [x, setX] = useState(''),
    [y, setY] = useState(''),
    [chart, setChart] = useState<ChartData | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const columns = dataset.profile.columnProfiles,
    numeric = columns.filter((c) => ['integer', 'decimal'].includes(c.type)),
    xs = ['histogram', 'scatter'].includes(kind) ? numeric : columns;
  const chosenX = xs.some((c) => c.name === x) ? x : xs[0]?.name || '',
    ys = numeric.filter((c) => c.name !== chosenX),
    chosenY = ys.some((c) => c.name === y) ? y : ys[0]?.name || '';
  const needsY = ['line', 'scatter'].includes(kind);
  useEffect(() => {
    let cancelled = false;
    setChart(null);
    setError('');
    if (!chosenX || (needsY && !chosenY)) return;
    setLoading(true);
    const query = new URLSearchParams({ kind, x: chosenX, ...(needsY ? { y: chosenY } : {}) });
    api<ChartData>(`/datasets/${dataset.id}/chart?${query}`)
      .then((result) => {
        if (!cancelled) setChart(result);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dataset.id, dataset.revision, kind, chosenX, chosenY, needsY]);
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Explore your data</h2>
          <p className="muted">Choose columns to reveal patterns in the current working dataset.</p>
        </div>
        <BarChart3 size={24} />
      </div>
      <div className="chart-controls">
        <label>
          Chart type
          <select value={kind} onChange={(e) => setKind(e.target.value as ChartData['kind'])}>
            <option value="bar">Bar chart</option>
            <option value="histogram">Histogram</option>
            <option value="line">Line chart</option>
            <option value="scatter">Scatter plot</option>
          </select>
        </label>
        <label>
          {needsY ? 'X column' : 'Column'}
          <select value={chosenX} onChange={(e) => setX(e.target.value)}>
            {xs.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
        </label>
        {needsY && (
          <label>
            Y column
            <select value={chosenY} onChange={(e) => setY(e.target.value)}>
              {ys.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <ErrorMessage message={error} />
      {loading ? (
        <p className="loading" role="status">
          Preparing chart…
        </p>
      ) : chart?.data.length ? (
        <>
          <div className="chart-caption">
            <Badge tone="purple">{chart.includedRows} rows included</Badge>
            <span>
              {chart.missingRows} rows missing required values
              {chart.limited ? ' · Display limited for readability' : ''}
            </span>
          </div>
          <Chart chart={chart} />
        </>
      ) : (
        <Empty
          title="Choose compatible columns"
          description={
            needsY
              ? 'Line and scatter charts need a separate numeric Y column.'
              : 'This column has no values to plot.'
          }
        />
      )}
      <p className="notice">
        Bar charts show the top 12 values. Histograms use up to 10 bins. Line charts show up to 200
        valid rows; scatter plots show up to 400. These views are exploratory, not statistical
        conclusions.
      </p>
    </section>
  );
}
