import { useState } from 'react';
import { Wand2, Search } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { api, send } from '../lib/api';
import { operations, validateOperation, errorMessage, formatNumber } from '../lib/operations';
import type {
  Dataset,
  Operation,
  OperationKind,
  TransformPreview,
  DuplicateReview,
  DataType,
} from '../lib/types';
import { ErrorMessage, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
export function CleanPage({ dataset }: { dataset: Dataset }) {
  const { update } = useWorkspace();
  const [kind, setKind] = useState<OperationKind>('remove_duplicates'),
    [column, setColumn] = useState(''),
    [columns, setColumns] = useState<string[]>([]),
    [value, setValue] = useState(''),
    [target, setTarget] = useState<DataType>('text'),
    [review, setReview] = useState<{ signature: string; data: TransformPreview } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [duplicateColumn, setDuplicateColumn] = useState(''),
    [duplicates, setDuplicates] = useState<DuplicateReview | null>(null);
  const profiles = dataset.profile.columnProfiles;
  const eligible = profiles.filter((c) =>
    ['fill_mean', 'fill_median'].includes(kind)
      ? ['integer', 'decimal'].includes(c.type)
      : kind === 'fill_category'
        ? c.type === 'text'
        : true,
  );
  const chosen = eligible.some((c) => c.name === column) ? column : eligible[0]?.name || '';
  const single = [
      'fill_mean',
      'fill_median',
      'fill_category',
      'rename_column',
      'convert_type',
    ].includes(kind),
    multiple = ['drop_missing', 'drop_columns', 'trim_whitespace'].includes(kind);
  const operation: Operation = {
    operation: kind,
    ...(single ? { column: chosen } : {}),
    ...(multiple ? { columns: columns.filter((c) => profiles.some((p) => p.name === c)) } : {}),
    ...(['fill_category', 'rename_column'].includes(kind) ? { value } : {}),
    ...(kind === 'convert_type' ? { target } : {}),
  };
  const signature = JSON.stringify({ revision: dataset.revision, operation });
  const current = review?.signature === signature ? review.data : null;
  async function preview() {
    setBusy(true);
    setError('');
    try {
      validateOperation(operation);
      const data = await api<TransformPreview>(
        `/datasets/${dataset.id}/preview-transform`,
        send({ revision: dataset.revision, transform: operation }),
      );
      setReview({ signature, data });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    if (!current) return;
    setBusy(true);
    setError('');
    try {
      await update(
        await api<Dataset>(
          `/datasets/${dataset.id}/transform`,
          send({ revision: dataset.revision, transform: operation }),
        ),
      );
      setReview(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function scan() {
    setBusy(true);
    setError('');
    try {
      setDuplicates(
        await api<DuplicateReview>(
          `/datasets/${dataset.id}/duplicates?column=${encodeURIComponent(duplicateColumn || profiles.find((p) => p.type === 'text')?.name || '')}`,
        ),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="clean-layout">
      <section className="panel tool-picker">
        <div className="section-heading">
          <h2>Cleaning tools</h2>
          <Badge>10 tools</Badge>
        </div>
        {['Rows', 'Missing values', 'Columns', 'Text & types'].map((group) => (
          <div key={group}>
            <p className="eyebrow">{group}</p>
            {operations
              .filter((o) => o.group === group)
              .map((o) => (
                <button
                  key={o.kind}
                  className={'tool ' + (kind === o.kind ? 'active' : '')}
                  onClick={() => {
                    setKind(o.kind);
                    setError('');
                    setColumns([]);
                  }}
                >
                  {o.name}
                </button>
              ))}
          </div>
        ))}
      </section>
      <div className="stack">
        <section className="panel">
          <div className="section-heading">
            <h2>{operations.find((o) => o.kind === kind)?.name}</h2>
            <Wand2 size={20} />
          </div>
          <p className="muted">{operations.find((o) => o.kind === kind)?.description}</p>
          <div className="form-grid">
            {single && (
              <label>
                Column
                <select value={chosen} onChange={(e) => setColumn(e.target.value)}>
                  {eligible.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
            {single && !eligible.length && (
              <p className="notice">No compatible columns are available for this tool.</p>
            )}
            {multiple && (
              <fieldset>
                <legend>Columns {kind === 'drop_columns' ? 'to remove' : 'to inspect'}</legend>
                {kind !== 'drop_columns' && (
                  <p className="hint">Leave all unchecked to use every compatible column.</p>
                )}
                <div className="checkbox-grid">
                  {profiles
                    .filter((c) => kind !== 'trim_whitespace' || c.type === 'text')
                    .map((c) => (
                      <label className="checkbox" key={c.name}>
                        <input
                          type="checkbox"
                          checked={columns.includes(c.name)}
                          onChange={(e) =>
                            setColumns((previous) =>
                              e.target.checked
                                ? [...previous, c.name]
                                : previous.filter((n) => n !== c.name),
                            )
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                </div>
              </fieldset>
            )}
            {['fill_category', 'rename_column'].includes(kind) && (
              <label>
                {kind === 'rename_column' ? 'New column name' : 'Replacement value'}
                <input
                  value={value}
                  maxLength={kind === 'rename_column' ? 80 : 200}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={kind === 'rename_column' ? 'e.g. customer_name' : 'e.g. Unknown'}
                />
              </label>
            )}
            {kind === 'convert_type' && (
              <label>
                Target data type
                <select value={target} onChange={(e) => setTarget(e.target.value as DataType)}>
                  {['text', 'integer', 'decimal', 'boolean', 'date'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {kind === 'convert_type' && (
            <p className="hint">
              Dates use YYYY-MM-DD. Integers cannot contain fractions. Incompatible values reject
              the entire step.
            </p>
          )}
          <ErrorMessage message={error} />
          <div className="actions">
            <button
              className="button secondary"
              disabled={busy || (single && !eligible.length)}
              onClick={() => void preview()}
            >
              {busy ? 'Working…' : 'Preview changes'}
            </button>
            <button
              className="button primary"
              disabled={!current || busy}
              onClick={() => void apply()}
            >
              Apply transformation
            </button>
          </div>
          <p className="hint">
            Review changes before applying. Your original dataset stays available.
          </p>
        </section>
        {current && (
          <section className="panel">
            <div className="section-heading">
              <h2>Transformation preview</h2>
              <Badge tone="purple">Not applied yet</Badge>
            </div>
            <p>{current.description}</p>
            <div className="review-metrics">
              {[
                ['Rows', current.before.rows, current.after.rows],
                ['Columns', current.before.columns, current.after.columns],
                ['Missing cells', current.before.missingCells, current.after.missingCells],
              ].map(([name, before, after]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>
                    {formatNumber(Number(before))} → {formatNumber(Number(after))}
                  </strong>
                </div>
              ))}
            </div>
            <DataTable data={current.preview} />
          </section>
        )}
        <section className="panel">
          <div className="section-heading">
            <h2>Possible duplicate values</h2>
            <Search size={20} />
          </div>
          <p className="muted">
            Review spelling, spacing, punctuation and accent variations. Suggestions never merge
            values automatically.
          </p>
          <div className="inline-form">
            <label>
              Text column
              <select
                value={duplicateColumn || profiles.find((p) => p.type === 'text')?.name || ''}
                onChange={(e) => {
                  setDuplicateColumn(e.target.value);
                  setDuplicates(null);
                }}
              >
                {profiles
                  .filter((p) => p.type === 'text')
                  .map((p) => (
                    <option key={p.name}>{p.name}</option>
                  ))}
              </select>
            </label>
            <button
              className="button secondary"
              disabled={busy || !profiles.some((p) => p.type === 'text')}
              onClick={() => void scan()}
            >
              Find similar values
            </button>
          </div>
          {duplicates && (
            <div>
              <p className="hint">
                Reviewed {duplicates.reviewedValues} of {duplicates.totalUnique} unique values. Up
                to 30 candidate pairs.
              </p>
              {duplicates.candidates.length ? (
                <div className="candidate-list">
                  {duplicates.candidates.map((c, i) => (
                    <div key={i}>
                      <strong>
                        {c.left} <span className="muted">↔</span> {c.right}
                      </strong>
                      <span>
                        {c.reason} · {c.leftCount} / {c.rightCount} occurrences
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="notice">No likely duplicate values found in this review.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
