import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/backend';
import type { Row } from '../App';

type Props = { 
  rows: Row[]; 
  onRowsUpdate?: (rows: Row[]) => void;
  selection?: {second:number; file_name:string}[];
};

export default function MLPanel({ rows, onRowsUpdate, selection = [] }: Props) {
  const [model, setModel] = useState('Random Forest');
  const [split, setSplit] = useState(80);
  const [out, setOut] = useState<any>(null);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [spectrogramB64, setSpectrogramB64] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [localRows, setLocalRows] = useState<Row[]>(rows);
  const [selectionSpectrograms, setSelectionSpectrograms] = useState<{key:string; b64:string}[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  // Load spectrograms when selection changes
  useEffect(() => {
    (async () => {
      if (selection.length === 0) {
        setSelectionSpectrograms([]);
        return;
      }
      try {
        const dedup = Array.from(new Map(selection.map(s=> [`${s.file_name}@${s.second}`, s])).values());
        const out: {key:string; b64:string}[] = [];
        for (const s of dedup.slice(0, 4)) {
          const r = await api('/api/spectrogram', { 
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body: JSON.stringify({ 
              file_path: s.file_name, 
              start_s: s.second, 
              dur_s: 1.0, 
              fmin: 0, 
              fmax: 20000,
              cmap: 'viridis'
            })
          });
          if (r.png_base64) {
            out.push({ key: `${s.file_name}@${s.second}`, b64: r.png_base64 });
          }
        }
        setSelectionSpectrograms(out);
      } catch (error) {
        console.error('Selection spectrogram error:', error);
      }
    })();
  }, [selection]);

  async function run() {
    try {
      if (!rows || rows.length === 0 || !rows.some(r => r.label !== undefined)) {
        setOut({ error: 'No labeled data available. Please run clustering first.' });
        return;
      }
      const r = await api('/api/classify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model, split_pct: split }) });
      if (r.error) {
        setOut({ error: r.error });
      } else {
        setOut(r);
      }
    } catch (error) {
      setOut({ error: error instanceof Error ? error.message : String(error) });
      console.error('Classification error:', error);
    }
  }

  async function playSegment(row: Row) {
    setSelectedRow(row);
    setEditingLabel(row.label !== undefined ? String(row.label) : '');
    
    try {
      const r = await api('/api/spectrogram', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ 
          file_path: row.file_name, 
          start_s: row.second, 
          dur_s: 1.0, 
          fmin: 0, 
          fmax: 20000,
          cmap: 'viridis'
        })
      });
      if (r.png_base64) {
        setSpectrogramB64(r.png_base64);
      }
    } catch (error) {
      console.error('Spectrogram load error:', error);
    }

    if (audioRef.current) {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        audioRef.current.src = `asset://localhost/${row.file_name.replace(/^\//, '')}#t=${row.second},${row.second + 1}`;
        audioRef.current.play().catch(err => console.error('Audio play error:', err));
        setIsPlaying(true);
      } else {
        console.warn('Audio playback not available in browser mode');
      }
    }
  }

  function togglePlayPause() {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(err => console.error('Audio play error:', err));
        setIsPlaying(true);
      }
    }
  }

  function nextSegment() {
    if (!selectedRow) return;
    const currentIndex = localRows.findIndex(r => r.second === selectedRow.second && r.file_name === selectedRow.file_name);
    if (currentIndex >= 0 && currentIndex < localRows.length - 1) {
      playSegment(localRows[currentIndex + 1]);
    }
  }

  function prevSegment() {
    if (!selectedRow) return;
    const currentIndex = localRows.findIndex(r => r.second === selectedRow.second && r.file_name === selectedRow.file_name);
    if (currentIndex > 0) {
      playSegment(localRows[currentIndex - 1]);
    }
  }

  function updateLabel() {
    if (!selectedRow) return;
    const trimmed = editingLabel.trim();
    const newLabel = trimmed === '' ? undefined : Number(trimmed);
    
    if (trimmed !== '' && isNaN(newLabel as number)) {
      alert('Label must be a number');
      return;
    }
    
    const updatedRows = localRows.map(r => 
      r.second === selectedRow.second && r.file_name === selectedRow.file_name 
        ? { ...r, label: newLabel }
        : r
    );
    setLocalRows(updatedRows);
    setSelectedRow({ ...selectedRow, label: newLabel });
    if (onRowsUpdate) {
      onRowsUpdate(updatedRows);
    }
  }

  function exportToCSV() {
    if (localRows.length === 0) {
      alert('No data to export');
      return;
    }
    
    const allKeys = new Set<string>();
    localRows.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);
    
    let csv = headers.join(',') + '\n';
    localRows.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === undefined || value === null) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csv += values.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labeled_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (localRows.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Audio Labeling & Classification</h3>
        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-6 text-center">
          <h4 className="text-yellow-200 font-semibold text-lg mb-3">⚠️ No Audio Data Loaded Yet</h4>
          <p className="text-gray-300 text-sm mb-4">Upload audio files and run the pipeline to start labeling</p>
          <ol className="text-left text-sm text-gray-300 space-y-2 max-w-md mx-auto">
            <li>1. Upload audio files (WAV, MP3, FLAC, etc.)</li>
            <li>2. Select feature extraction method</li>
            <li>3. Choose dimensionality reduction</li>
            <li>4. Click <strong className="text-white">VISUALIZE</strong></li>
            <li>5. Once loaded, segments will appear here for labeling!</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Spectrograms from plot */}
      {selectionSpectrograms.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <h4 className="text-white font-medium mb-3">📊 Selected Points Spectrograms</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {selectionSpectrograms.map(img=> (
              <img key={img.key} src={`data:image/png;base64,${img.b64}`} className="w-full h-auto rounded-lg" alt="Spectrogram" />
            ))}
          </div>
        </div>
      )}

      {/* Main Audio Labeling Panel */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4">🎵 Audio Labeling & Classification Tool</h3>
        
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Classification */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-200">Classification & Export</h4>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Model</label>
              <select 
                value={model} 
                onChange={e=> setModel(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              >
                <option>Random Forest</option>
                <option>Decision Tree</option>
                <option>Gradient Boosting</option>
                <option>Linear SVM</option>
                <option>Voting Classifier</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Train split %</label>
              <input 
                type="number" 
                value={split} 
                min={50} 
                max={90} 
                step={5}
                onChange={e=> setSplit(parseInt(e.target.value) || 80)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              />
            </div>
            <button 
              onClick={run}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm font-medium"
            >
              Run Classification
            </button>
            
            {out && (
              <div className="p-3 bg-gray-700 rounded-lg text-xs">
                {out.error ? (
                  <div className="text-red-400">Error: {out.error}</div>
                ) : (
                  <>
                    <div className="text-white">Accuracy: {out.accuracy?.toFixed?.(4)}</div>
                    <div className="text-gray-300 mt-2 whitespace-pre-wrap">Report:\n{out.report}</div>
                  </>
                )}
              </div>
            )}

            <button 
              onClick={exportToCSV}
              className="w-full bg-accent-600 hover:bg-accent-700 text-white py-2 rounded-lg text-sm font-medium"
            >
              📥 Export Labels to CSV
            </button>
          </div>

          {/* Center: Spectrogram & Label Editor */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-200">Spectrogram & Label Editor</h4>
              {selectedRow && (
                <span className="text-xs text-gray-400">
                  {localRows.findIndex(r => r.second === selectedRow.second && r.file_name === selectedRow.file_name) + 1} / {localRows.length}
                </span>
              )}
            </div>

            {/* Audio Controls */}
            <div className="flex gap-2 p-2 bg-gray-700 rounded-lg">
              <button 
                onClick={prevSegment} 
                disabled={!selectedRow}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded text-sm"
              >
                ⏮ Prev
              </button>
              <button 
                onClick={togglePlayPause} 
                disabled={!selectedRow}
                className="flex-1 px-3 py-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded text-sm"
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button 
                onClick={nextSegment} 
                disabled={!selectedRow}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded text-sm"
              >
                Next ⏭
              </button>
            </div>

            {/* Spectrogram Display */}
            <div className="bg-black rounded-lg p-2 h-48 flex items-center justify-center">
              {spectrogramB64 ? (
                <img src={`data:image/png;base64,${spectrogramB64}`} className="max-w-full max-h-full object-contain" alt="Spectrogram" />
              ) : (
                <p className="text-gray-500 text-sm">
                  {selectedRow ? 'Loading...' : 'Select a segment'}
                </p>
              )}
            </div>

            {/* Label Editor */}
            {selectedRow && (
              <div className="p-3 bg-gray-700 rounded-lg">
                <label className="block text-xs text-gray-400 mb-2">Edit Label:</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={editingLabel} 
                    onChange={e => setEditingLabel(e.target.value)}
                    placeholder="Enter label (number)"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    onKeyPress={e => e.key === 'Enter' && updateLabel()}
                  />
                  <button 
                    onClick={updateLabel}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    Update
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {selectedRow.file_name.split('/').pop()} | {selectedRow.second}s | Current: {selectedRow.label ?? 'unlabeled'}
                </div>
              </div>
            )}
          </div>

          {/* Right: Segment List */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-200">Segments ({localRows.length})</h4>
            <div className="h-96 overflow-y-auto space-y-1">
              {localRows.map((row, idx) => (
                <div 
                  key={idx}
                  onClick={() => playSegment(row)}
                  className={`p-2 rounded cursor-pointer border ${
                    selectedRow?.second === row.second && selectedRow?.file_name === row.file_name
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-xs font-medium truncate">{row.file_name.split('/').pop()}</div>
                  <div className="text-xs opacity-75">{row.second}s | Label: {row.label ?? '(none)'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio 
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      </div>
    </div>
  );
}
