import { useState } from 'react';
import {
  Layers3,
  Plus,
  Database,
  HelpCircle,
  Trash2,
  ShieldCheck,
  Download,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { useWorkspace } from './hooks/useWorkspace';
import { Home } from './pages/Home';
import { Overview } from './pages/Overview';
import { PreviewPage } from './pages/PreviewPage';
import { CleanPage } from './pages/CleanPage';
import { ChartsPage } from './pages/ChartsPage';
import { HistoryPage } from './pages/HistoryPage';
import { ErrorMessage, Modal, Badge } from './components/ui';
import { download } from './lib/api';
import { errorMessage, formatNumber } from './lib/operations';
import type { Dataset } from './lib/types';
function Workbench({ dataset }: { dataset: Dataset }) {
  const [tab, setTab] = useState('Overview'),
    [exporting, setExporting] = useState(''),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false);
  const { select, remove, busy, home } = useWorkspace();
  async function exportFile(format: 'csv' | 'xlsx') {
    setExporting(format);
    setError('');
    try {
      await download(dataset.id, format);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExporting('');
    }
  }
  return (
    <>
      <div className="dataset-heading">
        <div>
          <button className="text-button" onClick={home}>
            <ArrowLeft size={14} />
            All datasets
          </button>
          <div className="title-row">
            <h1>{dataset.name}</h1>
            <Badge>{dataset.source.format}</Badge>
            {dataset.source.sample && <Badge tone="purple">Demo dataset</Badge>}
          </div>
          <p className="muted">
            {dataset.source.sheet ? `Worksheet: ${dataset.source.sheet} · ` : ''}Original preserved
            · {dataset.history.length} transformations applied
          </p>
        </div>
        <div className="actions">
          <button
            className="icon-button"
            aria-label="Refresh dataset"
            disabled={busy}
            onClick={() => void select(dataset.id)}
          >
            <RefreshCw size={18} />
          </button>
          <button
            className="button secondary"
            disabled={!!exporting}
            onClick={() => void exportFile('csv')}
          >
            <Download size={16} />
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            className="button primary"
            disabled={!!exporting}
            onClick={() => void exportFile('xlsx')}
          >
            <Download size={16} />
            {exporting === 'xlsx' ? 'Exporting…' : 'Export Excel'}
          </button>
          <button
            className="icon-button danger"
            aria-label="Delete dataset"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <ErrorMessage message={error} />
      <div className="metrics">
        {[
          ['Rows', dataset.profile.rows],
          ['Columns', dataset.profile.columns],
          ['Missing cells', dataset.profile.missingCells],
          ['Duplicate rows', dataset.profile.duplicateRows],
        ].map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{formatNumber(Number(value))}</strong>
            <span className="hint">Working dataset</span>
          </div>
        ))}
      </div>
      <nav className="tabs" aria-label="Dataset views">
        {['Overview', 'Preview', 'Clean', 'Charts', 'History'].map((name) => (
          <button
            key={name}
            className={tab === name ? 'active' : ''}
            aria-current={tab === name ? 'page' : undefined}
            onClick={() => setTab(name)}
          >
            {name}
            {name === 'History' && dataset.history.length > 0 && (
              <span>{dataset.history.length}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="tab-content">
        {tab === 'Overview' ? (
          <Overview dataset={dataset} />
        ) : tab === 'Preview' ? (
          <PreviewPage dataset={dataset} />
        ) : tab === 'Clean' ? (
          <CleanPage dataset={dataset} />
        ) : tab === 'Charts' ? (
          <ChartsPage dataset={dataset} />
        ) : (
          <HistoryPage dataset={dataset} />
        )}
      </div>
      {confirm && (
        <Modal title="Delete this dataset?" onClose={() => setConfirm(false)}>
          <p>
            The original, working copy and transformation history will be permanently removed from
            this session.
          </p>
          <div className="actions">
            <button className="button secondary" onClick={() => setConfirm(false)}>
              Keep dataset
            </button>
            <button
              className="button danger-button"
              disabled={busy}
              onClick={() => void remove(dataset.id)}
            >
              Delete dataset
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export default function App() {
  const workspace = useWorkspace();
  const [help, setHelp] = useState(false),
    [clear, setClear] = useState(false);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={workspace.home}>
          <span className="brand-mark">
            <Layers3 size={23} />
          </span>
          DataForge<span className="brand-dot">●</span>
        </button>
        <p className="workspace-label">YOUR DATA WORKSPACE</p>
        <button
          className={'sidebar-home ' + (!workspace.selected ? 'active' : '')}
          onClick={workspace.home}
        >
          <Plus size={18} />
          Import & explore
        </button>
        <div className="sidebar-section">
          <div className="sidebar-section-heading">
            <span>Datasets</span>
            <span>{workspace.datasets.length}/3</span>
          </div>
          <div className="dataset-list">
            {workspace.datasets.map((d) => (
              <button
                key={d.id}
                className={workspace.selected?.id === d.id ? 'selected' : ''}
                disabled={workspace.busy}
                onClick={() => void workspace.select(d.id)}
              >
                <Database size={17} />
                <span>
                  <strong>{d.name}</strong>
                  <small>
                    {d.rows} rows · {d.columns} columns
                  </small>
                </span>
              </button>
            ))}
            {!workspace.datasets.length && (
              <p className="sidebar-empty">Your imported datasets will appear here.</p>
            )}
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={19} />
            <div>
              <strong>Private, temporary workspace</strong>
              <p>Data expires after one hour. Export your work before leaving.</p>
              {workspace.session && (
                <small>
                  Expires{' '}
                  {new Date(workspace.session.expiresAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              )}
            </div>
          </div>
          <button onClick={() => setHelp(true)}>
            <HelpCircle size={17} />
            Workspace guide
          </button>
          <button onClick={() => setClear(true)} disabled={workspace.busy}>
            <Trash2 size={17} />
            Clear workspace
          </button>
          <p className="sidebar-footer">A quieter way to clean your data.</p>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <span>
            <span className="status-dot" />
            Data preparation studio
          </span>
          <Badge>CSV + Excel</Badge>
        </div>
        <div className="main-content">
          <ErrorMessage message={workspace.error} />
          {workspace.error && (
            <button
              className="button secondary"
              disabled={workspace.busy}
              onClick={() => void workspace.startFresh()}
            >
              Start a fresh session
            </button>
          )}
          {workspace.loading ? (
            <div className="loading" role="status">
              Preparing your private workspace…
            </div>
          ) : workspace.selected ? (
            <Workbench key={workspace.selected.id} dataset={workspace.selected} />
          ) : (
            <Home />
          )}
        </div>
        <footer className="main-footer">
          <span>DataForge · Built for clearer data</span>
          <span>No account required · Values-only processing</span>
        </footer>
      </main>
      {help && (
        <Modal title="Your workspace guide" onClose={() => setHelp(false)}>
          <ol className="guide">
            <li>
              <strong>Import or explore.</strong> Use a UTF-8 CSV or values-only XLSX, up to 5 MB.
              Select a worksheet before importing Excel files.
            </li>
            <li>
              <strong>Understand the data.</strong> Overview reports real missing values, duplicates
              and types. Preview compares original and working copies.
            </li>
            <li>
              <strong>Review, then clean.</strong> Choose a tool, preview its effect and apply it.
              Undo the latest step in History.
            </li>
            <li>
              <strong>Explore and export.</strong> Charts reveal patterns. Export the complete
              working dataset as CSV or Excel.
            </li>
          </ol>
          <p className="notice">
            Your datasets are private to this browser session, held temporarily in server memory,
            and removed after one hour, when you clear them, or when the service restarts. No
            permanent storage is provided. Public demo files are fictional. Spreadsheet formulas,
            macros and external links are rejected.
          </p>
          <p className="hint">
            Limits: 10,000 rows, 50 columns, 250,000 cells, 3 datasets and 20 steps per dataset.
            Exported CSV text beginning with formula characters is prefixed with an apostrophe for
            spreadsheet safety.
          </p>
        </Modal>
      )}
      {clear && (
        <Modal title="Clear your workspace?" onClose={() => setClear(false)}>
          <p>
            All datasets, original files and transformation histories in this browser session will
            be deleted. Download anything you want to keep first.
          </p>
          <div className="actions">
            <button className="button secondary" onClick={() => setClear(false)}>
              Keep workspace
            </button>
            <button
              className="button danger-button"
              disabled={workspace.busy}
              onClick={() => void workspace.startFresh().then(() => setClear(false))}
            >
              Delete all datasets
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
