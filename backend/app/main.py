import asyncio, socket, json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from app.core.schemas import FeatureRequest, ReduceRequest, ClusterRequest, SpecRequest, ClassifyRequest, DataFramePayload
from app.core import algos

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["tauri://localhost", "http://localhost"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

_state = { 'features': None, 'reduced': None }

@app.get('/health')
def health():
    return { 'ok': True }

@app.post('/api/features')
def features(req: FeatureRequest):
    all_features = []
    for fp in req.file_paths:
        if req.mode == 'MFCC':
            df = algos.extract_mfcc(fp, segment_length=req.segment_length)
        elif req.mode == 'OpenL3':
            df = algos.extract_openl3(fp, segment_length=req.segment_length)
        else:  # CSV
            df = pd.read_csv(fp)
            # Handle categorical columns more carefully
            categorical_cols = []
            for col in df.columns:
                if df[col].dtype == 'object':
                    # Try to convert to numeric, if it fails, treat as categorical
                    try:
                        df[col] = pd.to_numeric(df[col])
                    except:
                        categorical_cols.append(col)
            
            # If there are categorical columns, handle them appropriately
            if categorical_cols:
                # Use the first categorical column as labels if no 'label' column exists
                if 'label' not in df.columns and categorical_cols:
                    label_col = categorical_cols[0]
                    df['label'] = pd.Categorical(df[label_col]).codes
                    categorical_cols.remove(label_col)
                
                # Drop remaining categorical columns (warn in logs)
                if categorical_cols:
                    print(f"Warning: Dropping non-numeric columns: {categorical_cols}")
                    df = df.drop(columns=categorical_cols)
            
            if 'second' not in df.columns:
                df['second'] = [i*1.0 for i in range(len(df))]
        df['file_name'] = fp
        all_features.append(df)
    if not all_features:
        return { 'error': 'No valid files' }
    feat = pd.concat(all_features, ignore_index=True)
    _state['features'] = feat
    return { 'rows': feat.to_dict(orient='records') }

@app.post('/api/reduce')
def reduce(req: ReduceRequest):
    if _state['features'] is None:
        return { 'error': 'no features' }
    try:
        red = algos.reduce_dim(_state['features'], req.method)
        _state['reduced'] = red
        return { 'rows': red.to_dict(orient='records') }
    except Exception as e:
        return { 'error': f'Reduction failed: {str(e)}' }

@app.post('/api/cluster')
def cluster(req: ClusterRequest):
    if _state['reduced'] is None:
        return { 'error': 'no reduced data' }
    try:
        labels, score, nuniq = algos.apply_clustering(_state['reduced'], req.algorithm, req.n_clusters)
        out = _state['reduced'].copy()
        out['label'] = labels
        _state['reduced'] = out
        return { 'rows': out.to_dict(orient='records'), 'silhouette': score, 'n_labels': nuniq }
    except Exception as e:
        return { 'error': f'Clustering failed: {str(e)}' }

@app.post('/api/spectrogram')
def spectrogram_png(req: SpecRequest):
    try:
        b64 = algos.make_spectrogram_png(req.file_path, req.start_s, req.dur_s, req.fmin, req.fmax, req.cmap)
        return { 'png_base64': b64 }
    except Exception as e:
        return { 'error': f'Spectrogram failed: {str(e)}' }

@app.post('/api/classify')
def classify(req: ClassifyRequest):
    if _state['reduced'] is None or 'label' not in _state['reduced'].columns:
        return { 'error': 'reduced data must include label column' }
    try:
        acc, rep, cm = algos.run_classifier(_state['reduced'], req.model, req.split_pct)
        return { 'accuracy': acc, 'report': rep, 'cm': cm }
    except Exception as e:
        return { 'error': f'Classification failed: {str(e)}' }

async def main():
    import uvicorn
    import os
    import subprocess
    
    port = int(os.getenv('SOUND_AI_PORT', '54388'))

    # Attempt to free the port before starting
    try:
        result = subprocess.run(
            ['lsof', '-ti', f'TCP:{port}'],
            capture_output=True,
            text=True,
            check=False
        )
        pids = [pid.strip() for pid in result.stdout.splitlines() if pid.strip()]
        for pid in pids:
            if pid and pid.isdigit() and int(pid) != os.getpid():
                subprocess.run(['kill', pid], check=False)
                print(f"Killed process {pid} using port {port}", flush=True)
    except Exception as cleanup_err:
        print(f"Port cleanup warning: {cleanup_err}", flush=True)
    
    print(json.dumps({ 'port': port }), flush=True)
    print(f"Backend listening on port {port}", flush=True)
    
    cfg = uvicorn.Config(app, host='127.0.0.1', port=port, log_level='warning')
    server = uvicorn.Server(cfg)
    await server.serve()

if __name__ == '__main__':
    asyncio.run(main())

