import { ArrowUpRight, Table2, Sparkles } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { UploadPanel } from '../components/UploadPanel';
import { PageHeading, Badge } from '../components/ui';
export function Home() {
  const { samples, loadSample, busy } = useWorkspace();
  return (
    <>
      <PageHeading
        eyebrow="FROM MESSY TO MEANINGFUL"
        title="Make your data work for you."
        description="Inspect, clean, and explore your spreadsheets in one thoughtful workspace."
      />
      <UploadPanel />
      <div className="section-heading">
        <div>
          <p className="eyebrow">A GOOD PLACE TO START</p>
          <h2>Try a sample dataset</h2>
        </div>
        <span className="sample-note">
          <Sparkles size={15} /> Fictional data. Real tools.
        </span>
      </div>
      <div className="sample-grid">
        {samples.map((sample, n) => (
          <article className="sample-card" key={sample.id}>
            <div className={'sample-icon sample-' + n}>
              <Table2 size={23} />
            </div>
            <Badge tone={sample.format === 'XLSX' ? 'green' : 'purple'}>{sample.format}</Badge>
            <p className="sample-category">{sample.category}</p>
            <h3>{sample.name}</h3>
            <p>{sample.description}</p>
            <div className="sample-meta">
              {sample.rows} rows <span>·</span> {sample.columns} columns
            </div>
            <button
              disabled={busy}
              className="sample-button"
              onClick={() => void loadSample(sample.id)}
            >
              Explore {sample.name.toLowerCase()}
              <ArrowUpRight size={17} />
            </button>
          </article>
        ))}
      </div>
      <div className="workflow-strip">
        <div>
          <span>01</span>
          <strong>Understand your data</strong>
          <p>See types, missing values, repeats, and real statistics.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Make careful changes</strong>
          <p>Preview each transformation and undo when needed.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Leave with something useful</strong>
          <p>Explore charts and download a clean CSV or Excel file.</p>
        </div>
      </div>
    </>
  );
}
