import Plot from 'react-plotly.js';
import type { Row } from '../App';

type Props = { rows: Row[]; onSelect: (sel:{second:number; file_name:string}[])=>void };
export default function ScatterPlot({ rows, onSelect }: Props) {
  const x = rows.map(r=> r.x ?? 0), y = rows.map(r=> r.y ?? 0);
  const text = rows.map(r=> `${r.file_name}\n${r.second.toFixed(1)}s${r.label!=null?`\nLabel ${r.label}`:''}`);
  const colors = rows.map(r=> r.label ?? 0);
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
      <h3 className="text-lg font-medium text-white mb-4">
        Data Visualization {rows.length > 0 && `(${rows.length} points)`}
      </h3>
      <div style={{height: '500px'}}>
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-gray-700 rounded-lg">
            <p className="text-gray-400">Upload audio files and click VISUALIZE to see data</p>
          </div>
        ) : (
          <Plot
            data={[{ 
              type:'scattergl', 
              mode:'markers', 
              x, 
              y, 
              text, 
              hoverinfo:'text', 
              marker:{ 
                size:8, 
                color: colors,
                colorscale: 'Viridis',
                showscale: true,
                line: {
                  color: 'white',
                  width: 1
                }
              } 
            }]}
            layout={{ 
              dragmode:'lasso',
              hovermode: 'closest',
              plot_bgcolor: '#1f2937',
              paper_bgcolor: '#1f2937',
              xaxis: {
                title: 'Component 1',
                gridcolor: '#374151',
                color: '#9ca3af'
              },
              yaxis: {
                title: 'Component 2',
                gridcolor: '#374151',
                color: '#9ca3af'
              },
              margin:{l:50,r:50,t:20,b:50}, 
              autosize:true,
              font: {
                color: '#e5e7eb'
              }
            }}
            config={{
              responsive: true,
              displayModeBar: true,
              modeBarButtonsToAdd: ['lasso2d', 'select2d']
            }}
            style={{width:'100%', height:'100%'}}
            useResizeHandler={true}
            onSelected={(ev:any)=> {
              const idxs = (ev?.points||[]).map((p:any)=> p.pointIndex).filter((i:number) => i >= 0 && i < rows.length);
              const sel = idxs.map((i:number)=> ({ second: rows[i].second, file_name: rows[i].file_name }));
              onSelect(sel);
            }}
          />
        )}
      </div>
    </div>
  );
}
