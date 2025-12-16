import { useRef, useState, type ChangeEvent } from 'react';
import type { Row } from '../App';

type Props = { onRun: (opts: any) => void; status: string; rows: Row[] };
export default function ControlsPanel({ onRun, status, rows }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<'MFCC'|'OpenL3'|'CSV'>('MFCC');
  const [segment] = useState(1.0);
  const [reduce, setReduce] = useState<'PCA'|'t-SNE'|'UMAP'>('PCA');
  const [clusterAlgo, setClusterAlgo] = useState('None');
  const [k, setK] = useState(3);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function pick() {
    fileInputRef.current?.click();
  }

  function onFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setFiles(selected);
  }

  // Calculate stats
  const totalPoints = rows.length;
  const uniqueFiles = new Set(rows.map(r => r.file_name)).size;
  const featureCols = rows.length > 0 ? Object.keys(rows[0]).filter(k => !['x','y','second','file_name','label'].includes(k)).length : 0;

  return (
    <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
      <h2 className="text-lg font-medium text-white mb-6">Analysis Pipeline</h2>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Upload Audio Files
        </label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-primary-400 transition-colors">
          <button
            onClick={pick}
            className="text-primary-500 hover:text-primary-400 font-medium"
          >
            Choose Files
          </button>
          <p className="text-xs text-gray-500 mt-1">WAV, MP3, FLAC, M4A, or CSV. Files stay local to the backend host.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".wav,.csv,.mp3,.flac,.m4a"
          className="hidden"
          onChange={onFileInputChange}
        />
        {files.length > 0 && (
          <div className="mt-2 text-sm text-gray-400">
            {files.length} file(s): {files.map(f => f.name).join(', ').substring(0, 80)}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-2">Feature Type</label>
          <div className="relative">
            <select
              value={mode}
              onChange={e=> setMode(e.target.value as any)}
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 rounded-xl text-white font-medium shadow-sm hover:border-primary-500 focus:border-primary-500 focus:ring-4 focus:ring-primary-900 transition-all appearance-none cursor-pointer"
            >
              <option>MFCC</option>
              <option>OpenL3</option>
              <option>CSV</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-2">Reduction Method</label>
          <div className="relative">
            <select
              value={reduce}
              onChange={e=> setReduce(e.target.value as any)}
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 rounded-xl text-white font-medium shadow-sm hover:border-primary-500 focus:border-primary-500 focus:ring-4 focus:ring-primary-900 transition-all appearance-none cursor-pointer"
            >
              <option>PCA</option>
              <option>t-SNE</option>
              <option>UMAP</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-2">Clustering</label>
          <div className="relative">
            <select
              value={clusterAlgo}
              onChange={e=> setClusterAlgo(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 rounded-xl text-white font-medium shadow-sm hover:border-primary-500 focus:border-primary-500 focus:ring-4 focus:ring-primary-900 transition-all appearance-none cursor-pointer"
            >
              <option>None</option>
              <option>KMeans</option>
              <option>GMM</option>
              <option>HDBSCAN</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>

      {clusterAlgo !== 'None' && (
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">Number of Clusters</label>
            <input
              type="number"
              value={k}
              min={2}
              max={10}
              onChange={e=> setK(parseInt(e.target.value) || 3)}
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 rounded-xl text-white font-medium"
            />
          </div>
      )}

        <button
          disabled={!files.length}
          onClick={()=> onRun({ files, mode, segment_length: segment, reduce, cluster: { algorithm: clusterAlgo, n:k } })}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          VISUALIZE
        </button>
      </div>

      {/* Statistics */}
      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Statistics</h3>
        <div className="text-xs text-gray-400 space-y-1">
          <div>Total points: <span className="text-white font-medium">{totalPoints}</span></div>
          <div>Features: <span className="text-white font-medium">{featureCols}</span></div>
          <div>Files: <span className="text-white font-medium">{uniqueFiles}</span></div>
          <div>Status: <span className="text-white font-medium">{status}</span></div>
        </div>
      </div>
    </div>
  );
}
