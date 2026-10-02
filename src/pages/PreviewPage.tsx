import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/operations';
import type { Dataset, Preview } from '../lib/types';
import { DataTable } from '../components/DataTable';
import { ErrorMessage } from '../components/ui';
export function PreviewPage({ dataset }: { dataset: Dataset }) {
  const [version, setVersion] = useState<'original' | 'current'>('current'),
    [offset, setOffset] = useState(0),
    [data, setData] = useState<Preview | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    setOffset(0);
  }, [dataset.id, dataset.revision, version]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api<Preview>(
      '/datasets/' + dataset.id + '/preview?version=' + version + '&offset=' + offset + '&limit=25',
    )
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dataset.id, dataset.revision, version, offset]);
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Original & working preview</h2>
          <p>Compare the first eight rows, then browse either full version.</p>
        </div>
      </div>
      <div className="preview-comparison">
        <section className="card">
          <div className="table-title">
            <h3>Original dataset</h3>
            <span>{dataset.originalProfile.rows} rows · untouched</span>
          </div>
          <DataTable data={dataset.originalPreview} compact />
        </section>
        <section className="card">
          <div className="table-title">
            <h3>Working dataset</h3>
            <span>
              {dataset.profile.rows} rows · {dataset.history.length} steps
            </span>
          </div>
          <DataTable data={dataset.currentPreview} compact />
        </section>
      </div>
      <section className="card preview-browser">
        <div className="table-title">
          <h3>Browse all rows</h3>
          <div className="segmented">
            <button
              className={version === 'original' ? 'selected' : ''}
              onClick={() => setVersion('original')}
            >
              Original
            </button>
            <button
              className={version === 'current' ? 'selected' : ''}
              onClick={() => setVersion('current')}
            >
              Working
            </button>
          </div>
        </div>
        <ErrorMessage message={error} />
        {loading ? (
          <div className="inline-loading">Loading rows…</div>
        ) : (
          data && <DataTable data={data} />
        )}
        <div className="pagination">
          <span>
            {data?.totalRows ? offset + 1 : 0}–{Math.min(offset + 25, data?.totalRows || 0)} of{' '}
            {data?.totalRows || 0} rows
          </span>
          <div>
            <button
              className="secondary"
              disabled={loading || offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 25))}
            >
              Previous rows
            </button>
            <button
              className="secondary"
              disabled={loading || offset + 25 >= (data?.totalRows || 0)}
              onClick={() => setOffset(offset + 25)}
            >
              Next rows
            </button>
          </div>
        </div>
      </section>
      <p className="small">
        Blank values are marked “Missing”. Column and cell text can scroll horizontally; exports
        preserve the full dataset.
      </p>
    </>
  );
}
