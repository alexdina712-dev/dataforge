import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, send } from '../lib/api';
import { errorMessage } from '../lib/operations';
import type { Dataset, DatasetSummary, Sample, Session } from '../lib/types';
interface Workspace {
  session: Session | null;
  datasets: DatasetSummary[];
  samples: Sample[];
  selected: Dataset | null;
  loading: boolean;
  busy: boolean;
  error: string;
  setError: (message: string) => void;
  select: (id: string) => Promise<void>;
  home: () => void;
  refresh: () => Promise<void>;
  startFresh: () => Promise<void>;
  loadSample: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  accept: (data: Dataset) => Promise<void>;
  update: (data: Dataset) => Promise<void>;
}
const Context = createContext<Workspace>(null!);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [datasets, setDatasets] = useState<DatasetSummary[]>([]),
    [samples, setSamples] = useState<Sample[]>([]),
    [selected, setSelected] = useState<Dataset | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const ticket = useRef(0),
    booted = useRef(false);
  async function boot() {
    setLoading(true);
    try {
      const current = await api<Session>('/session');
      setSession(current);
      const [list, demos] = await Promise.all([
        api<DatasetSummary[]>('/datasets'),
        api<Sample[]>('/samples'),
      ]);
      setDatasets(list);
      setSamples(demos);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      void boot();
    }
  }, []);
  async function refresh() {
    const list = await api<DatasetSummary[]>('/datasets');
    setDatasets(list);
  }
  async function accept(data: Dataset) {
    ticket.current++;
    setSelected(data);
    setError('');
    await refresh();
  }
  async function update(data: Dataset) {
    setSelected((previous) => (previous?.id === data.id ? data : previous));
    await refresh();
  }
  async function select(id: string) {
    const current = ++ticket.current;
    setBusy(true);
    try {
      const data = await api<Dataset>('/datasets/' + id);
      if (current === ticket.current) {
        setSelected(data);
        setError('');
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      if (current === ticket.current) setBusy(false);
    }
  }
  function home() {
    ticket.current++;
    setSelected(null);
    setBusy(false);
    setError('');
  }
  async function loadSample(id: string) {
    setBusy(true);
    try {
      await accept(await api<Dataset>('/samples/' + id, send({})));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await api('/datasets/' + id, { method: 'DELETE' });
      if (selected?.id === id) home();
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function startFresh() {
    setBusy(true);
    try {
      try {
        await api('/session', { method: 'DELETE' });
      } catch (e) {
        if ((e as { status: number }).status !== 401) throw e;
      }
      home();
      await boot();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        session,
        datasets,
        samples,
        selected,
        loading,
        busy,
        error,
        setError,
        select,
        home,
        refresh,
        startFresh,
        loadSample,
        remove,
        accept,
        update,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useWorkspace = () => useContext(Context);
