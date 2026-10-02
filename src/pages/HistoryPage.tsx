import { useState } from 'react';
import { Undo2, RotateCcw, Check } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { api, send } from '../lib/api';
import type { Dataset } from '../lib/types';
import { errorMessage } from '../lib/operations';
import { Empty, ErrorMessage, Modal } from '../components/ui';
export function HistoryPage({ dataset }: { dataset: Dataset }) {
  const { update } = useWorkspace();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false);
  async function change(action: 'undo' | 'reset') {
    setBusy(true);
    setError('');
    try {
      await update(
        await api<Dataset>(
          `/datasets/${dataset.id}/${action}`,
          send({ revision: dataset.revision }),
        ),
      );
      setConfirm(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Transformation history</h2>
          <p className="muted">Every applied step, in order. Undo removes the most recent step.</p>
        </div>
        <div className="actions">
          <button
            className="button secondary"
            disabled={busy || !dataset.history.length}
            onClick={() => void change('undo')}
          >
            <Undo2 size={16} />
            Undo last step
          </button>
          <button
            className="button secondary"
            disabled={busy || !dataset.history.length}
            onClick={() => setConfirm(true)}
          >
            <RotateCcw size={16} />
            Reset to original
          </button>
        </div>
      </div>
      <ErrorMessage message={error} />
      {dataset.history.length ? (
        <ol className="history">
          {dataset.history.map((step, i) => (
            <li key={i}>
              <div className="step-number">{i + 1}</div>
              <div>
                <h3>{step.description}</h3>
                <p>
                  {step.before.rows} → {step.after.rows} rows · {step.before.columns} →{' '}
                  {step.after.columns} columns · {step.before.missingCells} →{' '}
                  {step.after.missingCells} missing cells
                </p>
                <time>{new Date(step.createdAt).toLocaleString()}</time>
              </div>
              <Check size={18} />
            </li>
          ))}
        </ol>
      ) : (
        <Empty
          title="A clean starting point"
          description="Apply a transformation in Clean to start your history."
        />
      )}
      <p className="notice">
        Your original file is retained separately. Up to 20 steps are supported; undo reconstructs
        the working dataset from that original.
      </p>
      {confirm && (
        <Modal
          title="Reset this dataset?"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <p>
            All applied steps will be removed. The working dataset will return to its original
            values.
          </p>
          <div className="actions">
            <button className="button secondary" disabled={busy} onClick={() => setConfirm(false)}>
              Keep changes
            </button>
            <button className="button primary" disabled={busy} onClick={() => void change('reset')}>
              Reset dataset
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
