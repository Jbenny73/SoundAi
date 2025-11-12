# 🚀 Sound AI - Quick Start Guide (Desktop Only)

## ✅ Desktop Application Setup

This is a **desktop-only application**. All HTML interfaces have been removed.

### Prerequisites

1. **Python 3.8+** installed
2. **Node.js 16+** installed
3. **Rust** (latest stable) for building

### One-Command Setup

```bash
# Install all dependencies
cd "/Users/josephbenny/Downloads/Joseph/Python Code/sound-ai-desktop"
cd backend && pip install -r requirements.txt && cd ../app && npm install
```

### Run the Desktop App

```bash
cd "/Users/josephbenny/Downloads/Joseph/Python Code/sound-ai-desktop/app"
npm run tauri dev
```

That's it! The application will open automatically.

## 📊 Using the Application

### 1. Upload Files
- Click **"Choose Files"** button in the left panel
- Select audio files (WAV, MP3, FLAC, M4A) or CSV files
- Multiple files supported

### 2. Configure Settings
- **Feature Type**: MFCC (recommended), OpenL3, or CSV
- **Reduction Method**: PCA (fast), t-SNE, or UMAP
- **Clustering**: None, K-Means (3 clusters), GMM, or HDBSCAN

### 3. Run Analysis
- Click **"VISUALIZE"** button
- Wait for processing (status shown at bottom)
- Results appear in scatter plot

### 4. Explore Results
- **Scatter Plot**: Hover/click points to see details
- **Lasso Selection**: Drag to select multiple points
- **Spectrograms**: View in right panel
- **ML Panel**: Run classification, edit labels

### 5. Label & Export
- Click segments to view/edit
- Change labels manually
- Click **"Export Labels to CSV"** to save

## 🎯 Example Workflow

1. Upload audio files (e.g., `beethoven.wav`)
2. Keep defaults: MFCC, PCA, KMeans (3 clusters)
3. Click VISUALIZE
4. Wait ~10-30 seconds
5. Explore the scatter plot
6. Click points to see spectrograms
7. Run classification or edit labels
8. Export results

## 🛑 Stopping the App

- Just close the window
- Or press `Ctrl+C` in terminal

## 🔧 Development Mode

### Frontend Only
```bash
cd app
npm run dev
```
Opens in browser at `http://localhost:5173` (limited features)

### Desktop App (Full Features)
```bash
cd app
npm run tauri dev
```
Opens native window with all features enabled

## 📦 Building Executable

```bash
cd app
npm run tauri build
```

Find the executable in `app/src-tauri/target/release/`

## ⚠️ Common Issues

### "Failed to open page"
- Backend not starting: Check Python dependencies installed
- Port conflict: Close other apps using port 54388

### "Cannot find audio file"
- Audio playback only works in desktop mode
- Ensure full file paths are correct
- Check file permissions

### "No labeled data"
- Run clustering first before classification
- Ensure data processed successfully

## 📚 More Documentation

- `README.md` - Full documentation
- `FULL_SYSTEM_REVIEW.md` - Architecture details
- `HOW_TO_USE_LABELING.md` - Label editing guide

---

**Everything is ready! Just run `npm run tauri dev`** 🎉

**Note**: This is a desktop-only application. HTML browser interfaces have been removed for a better, focused desktop experience.
