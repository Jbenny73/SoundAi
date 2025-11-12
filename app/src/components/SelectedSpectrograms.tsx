import { useEffect, useState } from 'react';
import { api } from '../lib/backend';

type Sel = { second:number; file_name:string };
export default function SelectedSpectrograms({ selection, segmentLength }: { selection: Sel[]; segmentLength:number }) {
  const [images, setImages] = useState<{key:string; b64:string}[]>([]);
  useEffect(()=> {
    (async () => {
      try {
        const dedup = Array.from(new Map(selection.map(s=> [`${s.file_name}@${s.second}`, s])).values());
        const out: {key:string; b64:string}[] = [];
        for (const s of dedup) {
          const r = await api('/api/spectrogram', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ file_path: s.file_name, start_s: s.second, dur_s: segmentLength, fmin: 0, fmax: 20000 })});
          if (r.error) {
            console.error('Spectrogram error for', s.file_name, '@', s.second, ':', r.error);
            continue; // Skip this spectrogram but continue with others
          }
          if (r.png_base64) {
            out.push({ key: `${s.file_name}@${s.second}`, b64: r.png_base64 });
          }
        }
        setImages(out);
      } catch (error) {
        console.error('Spectrogram generation error:', error);
        setImages([]);
      }
    })();
  }, [selection, segmentLength]);
  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:8, overflow:'auto'}}>
      {images.map(img=> (
        <img key={img.key} src={`data:image/png;base64,${img.b64}`} style={{width:'100%', height:'auto'}} />
      ))}
    </div>
  );
}

