# Sound AI - Research Audio Analysis Workbench

Modern **researcher-focused** audio analysis experience built with React and FastAPI.

> The app now runs in the browser while the FastAPI backend runs locally. No Tauri shell is required.

## Features

- **Audio Analysis**: MFCC and OpenL3 feature extraction
- **Dimensionality Reduction**: PCA, t-SNE, UMAP
- **Clustering**: K-Means, GMM, HDBSCAN
- **Machine Learning**: Classification with multiple algorithms
- **Interactive Visualization**: Scatter plots with Plotly.js
- **Spectrogram Viewer**: Real-time spectrogram generation
- **Audio Playback**: Play and visualize segments (desktop only)
- **Label Editor**: Manually edit and export labels

## Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
cd app
npm install
```

### 3. Start the Backend (required)

```bash
cd backend
python -m app.main
# Expected log: {"port": 54388}\nBackend listening on port 54388
```

### 4. Run the Web Application

```bash
cd app
npm run dev
```

## Project Structure

```
sound-ai-desktop/
├── app/                    # Frontend (React web app)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ControlsPanel.tsx
│   │   │   ├── ScatterPlot.tsx
│   │   │   ├── SelectedSpectrograms.tsx
│   │   │   └── MLPanel.tsx
│   │   └── lib/
│   │       └── backend.ts
│   └── package.json
└── backend/                # Python backend
    ├── app/
    │   ├── main.py         # FastAPI server
    │   └── core/
    │       ├── algos.py    # ML algorithms
    │       └── schemas.py  # Data models
    └── requirements.txt
```

## Usage

### 1. Upload Audio Files
- Click "Choose Files" button
- Select WAV, MP3, FLAC, M4A, or CSV files
- Multiple files supported

### 2. Configure Analysis
- **Feature Type**: MFCC, OpenL3, or CSV
- **Reduction Method**: PCA, t-SNE, or UMAP
- **Clustering**: None, K-Means, GMM, or HDBSCAN
- **Number of Clusters**: 2-10 (if clustering enabled)

### 3. Run Analysis
- Click "VISUALIZE" button
- Wait for processing to complete
- Explore results in scatter plot

### 4. View Results
- **Scatter Plot**: Interactive visualization with color-coded clusters
- **Spectrograms**: Click points to view spectrograms
- **ML Panel**: Run classification, edit labels, export data

### 5. Label & Export
- Select segments from list
- Edit labels manually
- Export labeled data to CSV

## Development

### Frontend Development
```bash
cd app
npm run dev          # Run in browser
npm run build        # Build production assets (served by any static host)
```

### Backend Development
```bash
cd backend
python -m app.main   # Start FastAPI server (must run from backend directory)
```

## Supported File Formats

- **Audio**: WAV, MP3, FLAC, M4A
- **Data**: CSV with numeric features

## System Requirements

- **OS**: macOS, Windows, or Linux
- **Python**: 3.8+
- **Node.js**: 16+

## Troubleshooting

### Backend Connection Issues
- Ensure Python dependencies are installed: `pip install -r backend/requirements.txt`
- Check if port conflicts exist
- Review console logs for errors

### Audio Playback Not Working
- Audio playback only works in desktop mode (not browser)
- Ensure file paths are accessible
- Check file format compatibility

### Build Errors
- Update npm dependencies: `npm install`
- Clear cache: `rm -rf node_modules && npm install`
- Update Node.js: `nvm install --lts`

## Documentation

- `AGENTS.md` - **AI debugging guide** - Comprehensive troubleshooting, architecture, and recent changes for AI agents
- `HOW_TO_USE_LABELING.md` - User guide for audio labeling and classification features

## License

See LICENSE file for details.

## Architecture

This is a **web-first research application**:
- React frontend with Tailwind CSS served by Vite
- FastAPI backend (Python) running locally for secure audio processing
- Temporary server-side storage for uploaded files
- Optional native audio playback for environments that support it
