# Sound AI - Desktop Audio Analysis Application

Modern **desktop-only** audio analysis application built with Tauri, React, and FastAPI.

> **Note**: This is a desktop application. HTML interfaces have been removed. Use the Tauri desktop app only.

## Features

- **Audio Analysis**: MFCC and OpenL3 feature extraction
- **Dimensionality Reduction**: PCA, t-SNE, UMAP
- **Clustering**: K-Means, GMM, HDBSCAN
- **Machine Learning**: Classification with multiple algorithms
- **Interactive Visualization**: Scatter plots with Plotly.js
- **Spectrogram Viewer**: Real-time spectrogram generation
- **Audio Playback**: Play and visualize segments (desktop only)
- **Label Editor**: Manually edit and export labels
- **Native Desktop**: Cross-platform desktop application with Tauri

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

### 3. Run Desktop Application

```bash
cd app
npm run tauri dev
```

## Project Structure

```
sound-ai-desktop/
├── app/                    # Frontend (React + Tauri)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ControlsPanel.tsx
│   │   │   ├── ScatterPlot.tsx
│   │   │   ├── SelectedSpectrograms.tsx
│   │   │   └── MLPanel.tsx
│   │   └── lib/
│   │       └── backend.ts
│   ├── src-tauri/          # Rust backend
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
npm run dev          # Run in browser (limited features)
npm run tauri dev    # Run desktop app (full features)
npm run tauri build  # Build production executable
```

### Backend Development
```bash
cd backend
python app/main.py   # Start FastAPI server
```

The backend starts automatically when running the desktop app.

## Building for Production

```bash
cd app
npm run tauri build
```

Executables will be in `app/src-tauri/target/release/`.

## Supported File Formats

- **Audio**: WAV, MP3, FLAC, M4A
- **Data**: CSV with numeric features

## System Requirements

- **OS**: macOS, Windows, or Linux
- **Python**: 3.8+
- **Node.js**: 16+
- **Rust**: Latest stable (for building)

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
- Update Rust: `rustup update`

## Documentation

- `FULL_SYSTEM_REVIEW.md` - Complete system architecture
- `HOW_TO_USE_LABELING.md` - Label editing guide
- `REACT_APP_REDESIGN.md` - UI design documentation
- `CLEANUP_SUMMARY.md` - Recent cleanup changes

## License

See LICENSE file for details.

## Architecture

This is a **desktop-only application**:
- React frontend with Tailwind CSS
- Tauri for native desktop features
- FastAPI backend (Python)
- File system access for audio processing
- Native audio playback capabilities

**Previous HTML interfaces have been removed** - this project is focused on delivering the best desktop experience.
