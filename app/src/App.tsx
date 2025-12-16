import { FormEvent, useEffect, useRef, useState } from 'react';
import { startBackend, api, DEFAULT_PORT, configureBackendPort, uploadFiles } from './lib/backend';
import ControlsPanel from './components/ControlsPanel';
import ScatterPlot from './components/ScatterPlot';
import MLPanel from './components/MLPanel';

export type Row = { x?: number; y?: number; second: number; file_name: string; label?: number } & Record<string, any>;
type PipelineOptions = { files: File[]; mode: 'MFCC'|'OpenL3'|'CSV'; segment_length: number; reduce: 'PCA'|'t-SNE'|'UMAP'; cluster?: {algorithm:string; n:number} };

export default function App() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [selection, setSelection] = useState<{second:number; file_name:string}[]>([]);
  const [status, setStatus] = useState('Connecting...');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'processing'>('info');
  const portRef = useRef<number>(DEFAULT_PORT);
  const [connectionNonce, setConnectionNonce] = useState(1);
  const [portInput, setPortInput] = useState(String(DEFAULT_PORT));
  const [activePort, setActivePort] = useState(DEFAULT_PORT);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attemptCount = 0;

    const attemptConnection = async () => {
      if (cancelled) return;

      attemptCount += 1;
      const delayMs = Math.min(10000, 2000 * attemptCount);

      try {
        configureBackendPort(portRef.current);
        setStatus(`🔄 Connecting to backend on port ${portRef.current} (attempt ${attemptCount})...`);
        setStatusType('processing');

        await startBackend();
        if (cancelled) return;

        const ok = await api('/health');

        if (ok?.ok) {
          if (!cancelled) {
            setReady(true);
            setActivePort(portRef.current);
            setStatus(`✅ Connected on port ${portRef.current}`);
            setStatusType('success');
          }
          return;
        }

        throw new Error('Health check failed');
      } catch (error) {
        if (cancelled) return;
        console.warn(`Backend connection attempt ${attemptCount} failed. Retrying in ${delayMs / 1000}s...`, error);
        setReady(false);
        setStatus(
          `⏳ Backend unreachable on port ${portRef.current}. Start it with "python -m app.main" from backend/. Retrying in ${delayMs / 1000}s (attempt ${attemptCount})`
        );
        setStatusType('error');
        retryTimer = setTimeout(attemptConnection, delayMs);
      }
    };

    attemptConnection();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [connectionNonce]);

  function handlePortSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseInt(portInput, 10);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      setStatus('❌ Enter a valid port number between 1 and 65535');
      setStatusType('error');
      return;
    }

    if (parsed === portRef.current) {
      setStatus(`ℹ️ Backend already targeting port ${parsed}`);
      setStatusType('info');
      return;
    }

    portRef.current = parsed;
    configureBackendPort(parsed);
    setActivePort(parsed);
    setReady(false);
    setStatus(`🔄 Reconnecting to backend on port ${parsed}...`);
    setStatusType('processing');
    setConnectionNonce((value) => value + 1);
  }

  async function runPipeline(opts: PipelineOptions) {
    try {
      setStatus('📤 Uploading files to backend...');
      setStatusType('processing');
      const uploaded = await uploadFiles(opts.files);
      if (uploaded.error || !uploaded.file_paths) {
        setStatus('❌ ' + (uploaded.error ?? 'Upload failed'));
        setStatusType('error');
        return;
      }

      setStatus('🔄 Extracting features...');
      setStatusType('processing');
      const featResult = await api('/api/features', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ file_paths: uploaded.file_paths, mode: opts.mode, segment_length: opts.segment_length }) });
      if (featResult.error) {
        setStatus('❌ ' + featResult.error);
        setStatusType('error');
        return;
      }
      
      setStatus('🔄 Reducing dimensions...');
      const red = await api('/api/reduce', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ method: opts.reduce }) });
      if (red.error) {
        setStatus('❌ ' + red.error);
        setStatusType('error');
        return;
      }
      
      let current = red.rows as Row[];
      if (opts.cluster && opts.cluster.algorithm !== 'None') {
        setStatus('🔄 Clustering...');
        const clustered = await api('/api/cluster', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ algorithm: opts.cluster.algorithm, n_clusters: opts.cluster.n }) });
        if (clustered.error) {
          setStatus('❌ ' + clustered.error);
          setStatusType('error');
          return;
        }
        current = clustered.rows;
      }
      setRows(current); 
      setStatus('✅ Complete');
      setStatusType('success');
    } catch (error) {
      setStatus('❌ ' + (error instanceof Error ? error.message : String(error)));
      setStatusType('error');
      console.error('Pipeline error:', error);
    }
  }

  const statusColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    processing: 'bg-yellow-500'
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="mb-4 text-xl">Sound AI</div>
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 ${statusColors[statusType]} rounded-full animate-pulse`}></div>
            <span>{status}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Sound AI Research Console</h1>
                <p className="text-xs text-gray-400">Upload, explore, and cluster audio features for explainable ML experiments.</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <form className="flex items-center space-x-2" onSubmit={handlePortSubmit}>
                <label htmlFor="backend-port" className="text-sm text-gray-400">
                  Port
                </label>
                <input
                  id="backend-port"
                  className="w-20 rounded bg-gray-900 border border-gray-700 px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={portInput}
                  onChange={(event) => setPortInput(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  max={65535}
                />
                <button
                  type="submit"
                  className="rounded bg-primary-600 px-3 py-1 text-sm font-medium text-white hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Apply
                </button>
              </form>
              <div className="flex flex-col items-end">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 ${statusColors[statusType]} rounded-full`}></div>
                  <span className="text-sm text-gray-400">{status}</span>
                </div>
                <span className="text-xs text-gray-500">Active port: {activePort}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Use the port field to reconnect to a running backend or choose a port before launching locally.
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 py-8 h-full">
          <div className="grid grid-cols-4 gap-8 h-full">
            {/* Sidebar */}
            <div className="col-span-1 overflow-y-auto">
              <ControlsPanel onRun={runPipeline} status={status} rows={rows} />
            </div>

            {/* Main area */}
            <div className="col-span-3 space-y-6 overflow-y-auto">
              <ScatterPlot rows={rows} onSelect={(sel)=> setSelection(sel)} />
              <MLPanel rows={rows} onRowsUpdate={setRows} selection={selection} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
