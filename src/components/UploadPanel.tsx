import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/operations';
import type { Dataset } from '../lib/types';
import { useWorkspace } from '../hooks/useWorkspace';
import { Modal, ErrorMessage } from './ui';
export function UploadPanel() {
  const { accept } = useWorkspace(),
    input = useRef<HTMLInputElement>(null),
    ticket = useRef(0),
    [dragging, setDragging] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [sheets, setSheets] = useState<string[]>([]),
    [sheet, setSheet] = useState(''),
    [delimiter, setDelimiter] = useState('auto'),
    [error, setError] = useState(''),
    [inspecting, setInspecting] = useState(false),
    [saving, setSaving] = useState(false);
  async function choose(value: File) {
    setError('');
    if (!/\.(csv|xlsx)$/i.test(value.name)) {
      setError('Choose a CSV or XLSX file. Macros and other formats are not supported.');
      return;
    }
    if (value.size > 5 * 1024 * 1024) {
      setError('Files must be 5 MB or smaller.');
      return;
    }
    if (!value.size) {
      setError('The selected file is empty.');
      return;
    }
    setFile(value);
    setInspecting(true);
    setSheets([]);
    setSheet('');
    setDelimiter('auto');
    const current = ++ticket.current;
    try {
      const form = new FormData();
      form.set('file', value);
      const result = await api<{ sheets: string[] }>('/files/inspect', {
        method: 'POST',
        body: form,
      });
      if (current === ticket.current) {
        setSheets(result.sheets);
        setSheet(result.sheets[0] || '');
      }
    } catch (e) {
      if (current === ticket.current) setError(errorMessage(e));
    } finally {
      if (current === ticket.current) setInspecting(false);
    }
  }
  function close() {
    if (saving) return;
    ticket.current++;
    setFile(null);
    setInspecting(false);
    setError('');
    if (input.current) input.current.value = '';
  }
  async function upload() {
    if (!file || inspecting) return;
    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('delimiter', delimiter);
      if (sheet) form.set('sheet', sheet);
      const result = await api<Dataset>('/datasets', { method: 'POST', body: form });
      await accept(result);
      setFile(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
      if (input.current) input.current.value = '';
    }
  }
  function drop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length !== 1) {
      setError('Import one dataset at a time.');
      return;
    }
    void choose(e.dataTransfer.files[0]);
  }
  return (
    <>
      <div
        className={'upload-zone ' + (dragging ? 'dragging' : '')}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        <span className="upload-icon">
          <UploadCloud size={29} />
        </span>
        <h2>Bring your data. Find your clarity.</h2>
        <p>Drop a CSV or Excel workbook here to get started.</p>
        <button className="button" onClick={() => input.current?.click()}>
          Choose a file
        </button>
        <input
          ref={input}
          type="file"
          className="visually-hidden"
          aria-label="Upload CSV or Excel file"
          accept=".csv,.xlsx"
          onChange={(e) => {
            if (e.target.files?.[0]) void choose(e.target.files[0]);
          }}
        />
        <p className="upload-formats">
          CSV / XLSX <span>·</span> Up to 5 MB <span>·</span> No signup
        </p>
      </div>
      {!file && <ErrorMessage message={error} />}
      <div className="privacy-note">
        <ShieldCheck size={16} />
        <span>
          Private temporary workspace. Your datasets are removed when the session expires.
        </span>
      </div>
      {file && (
        <Modal title="Import your dataset" onClose={close}>
          <div className="import-file">
            <FileSpreadsheet size={30} />
            <div>
              <strong>{file.name}</strong>
              <p>
                {(file.size / 1024).toFixed(1)} KB ·{' '}
                {file.name.toLowerCase().endsWith('.xlsx') ? 'Excel workbook' : 'CSV file'}
              </p>
            </div>
          </div>
          {inspecting ? (
            <p role="status">Checking the file…</p>
          ) : (
            <>
              {sheets.length > 0 ? (
                <label>
                  Worksheet
                  <select
                    aria-label="Worksheet"
                    value={sheet}
                    onChange={(e) => setSheet(e.target.value)}
                  >
                    {sheets.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  CSV delimiter
                  <select
                    aria-label="CSV delimiter"
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                  >
                    <option value="auto">Detect automatically</option>
                    <option value="comma">Comma (,)</option>
                    <option value="semicolon">Semicolon (;)</option>
                    <option value="tab">Tab</option>
                    <option value="pipe">Pipe (|)</option>
                  </select>
                </label>
              )}
              <p className="small">
                The first row provides column names. Blank cells count as missing; identifiers with
                leading zeros stay as text. Formulas are rejected rather than evaluated.
              </p>
            </>
          )}
          <ErrorMessage message={error} />
          <div className="form-actions">
            <button className="secondary" disabled={saving} onClick={close}>
              Cancel
            </button>
            <button
              disabled={
                saving || inspecting || (file.name.toLowerCase().endsWith('.xlsx') && !sheet)
              }
              onClick={() => void upload()}
            >
              {saving ? 'Importing…' : 'Import dataset'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
