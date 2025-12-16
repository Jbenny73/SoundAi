# 🤖 AGENTS.md - AI Debugging Guide for Sound AI

**Purpose:** This document consolidates all critical information for AI agents to quickly understand, debug, and run the Sound AI application.

**Last Updated:** December 16, 2025

---

## 🚀 QUICK START - How to Run

### Prerequisites
- **Python 3.8+** (check: `python --version`)
- **Node.js 16+** (check: `node --version`)
- **pip** and **npm** installed

### Step 1: Install Dependencies

```bash
# Backend dependencies
cd backend
pip install -r requirements.txt

# Frontend dependencies  
cd ../app
npm install
```

### Step 2: Start Backend Server

**IMPORTANT:** The backend must be started separately before the frontend.

```bash
cd backend
python -m app.main
```

**Expected Output:**
```
{"port": 54388}
Backend listening on port 54388
```

**Port Configuration:**
- Default port: `54388` (set via `SOUND_AI_PORT` env var)
- Backend auto-kills processes using the port before starting
- Frontend expects backend at `http://127.0.0.1:54388` by default

### Step 3: Start Frontend

**Option A: Browser Mode (Limited Features)**
```bash
cd app
npm run dev -- --port 5173
```
Opens at `http://localhost:5173/`

**Option B: Tauri Desktop App (Full Features)**
```bash
cd app
npm run tauri dev
```
Opens native desktop window

---

## 🏗️ ARCHITECTURE OVERVIEW

### Project Structure
```
sound-ai-desktop/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI server entry point
│   │   └── core/
│   │       ├── algos.py       # ML algorithms (MFCC, PCA, clustering, etc.)
│   │       └── schemas.py     # Pydantic data models
│   └── requirements.txt
├── app/                        # React + Tauri frontend
│   ├── src/
│   │   ├── App.tsx            # Main React component
│   │   ├── components/        # UI components
│   │   └── lib/
│   │       └── backend.ts     # Backend API client
│   └── src-tauri/             # Tauri desktop app config
└── AGENTS.md                  # This file
```

### Communication Flow
1. **Frontend** (`app/src/lib/backend.ts`) → HTTP requests → **Backend** (`backend/app/main.py`)
2. Backend processes audio/CSV files, runs ML algorithms
3. Results returned as JSON, rendered in React components

### Key Technologies
- **Backend:** FastAPI (Python), uvicorn server
- **Frontend:** React + TypeScript, Vite build tool, Tailwind CSS
- **Desktop:** Tauri (Rust + WebView)
- **Visualization:** Plotly.js
- **ML:** scikit-learn, librosa, pandas, numpy

---

## 🔧 RECENT CHANGES & FIXES

### December 16, 2025 - Backend Startup Refactor

**Problem:** Duplicate `startBackend()` exports causing TypeScript compilation error:
```
Cannot redeclare exported variable 'startBackend'
```

**Root Cause:** Two conflicting implementations in `app/src/lib/backend.ts`:
1. Old implementation: Auto-spawned backend via Tauri Command API
2. New implementation: Simple health check ping

**Solution:** Removed old implementation, kept simplified version:
- `startBackend()` now only pings `/health` endpoint
- Backend must be started manually: `python -m app.main`
- Frontend throws clear error if backend not reachable

**Files Changed:**
- `app/src/lib/backend.ts` - Removed ~200 lines of old backend spawning code
- Kept: `configureBackendPort()`, `getConfiguredPort()`, `api()`, `uploadFiles()`

**Current Backend API (`backend.ts`):**
```typescript
export async function startBackend(): Promise<number>
export async function uploadFiles(files: File[]): Promise<{file_paths?: string[]; error?: string}>
export async function api(path: string, init?: RequestInit)
export function configureBackendPort(port: number)
export function getConfiguredPort(): number
```

### Backend Port Configuration

**Backend (`backend/app/main.py`):**
- Reads port from `SOUND_AI_PORT` environment variable
- Default: `54388`
- Auto-kills processes on port before starting (macOS/Linux only)
- Prints JSON `{"port": <port>}` on startup

**Frontend (`app/src/lib/backend.ts`):**
- Default port: `54388` (constant `DEFAULT_PORT`)
- Can be reconfigured via UI port input field
- Calls `configureBackendPort(port)` to update `BASE` URL
- `BASE` variable used for all API calls

---

## 🐛 COMMON DEBUGGING SCENARIOS

### Issue 1: "Backend not reachable" Error

**Symptoms:**
- Frontend shows: `Backend not reachable at http://127.0.0.1:54388`
- Console: `Backend not reachable: [error]`

**Debug Steps:**
1. Check if backend is running:
   ```bash
   curl http://localhost:54388/health
   # Should return: {"ok":true}
   ```

2. Check port conflicts:
   ```bash
   # macOS/Linux
   lsof -i :54388
   
   # Windows
   netstat -ano | findstr :54388
   ```

3. Start backend manually:
   ```bash
   cd backend
   python -m app.main
   ```

4. Verify backend output shows:
   ```
   {"port": 54388}
   Backend listening on port 54388
   ```

**Fix:** Ensure backend is running before starting frontend.

---

### Issue 2: Port Already in Use

**Symptoms:**
- Backend error: `[Errno 48] address already in use`
- Frontend dev server: `Port 5173 is already in use`

**Debug Steps:**
1. Find process using port:
   ```bash
   lsof -ti TCP:54388  # Backend port
   lsof -ti TCP:5173   # Frontend port
   ```

2. Kill process (if safe):
   ```bash
   kill <PID>
   ```

3. Or use different port:
   ```bash
   # Backend
   SOUND_AI_PORT=54389 python -m app.main
   
   # Frontend
   npm run dev -- --port 5174
   ```

**Fix:** Backend auto-kills port conflicts, but may fail if process is protected.

---

### Issue 3: Module Import Errors

**Symptoms:**
- `ModuleNotFoundError: No module named 'app'`
- `Cannot find module '@tauri-apps/api/shell'`

**Debug Steps:**

**Backend:**
```bash
# Wrong (from project root)
python app/main.py  # ❌

# Correct (from backend directory)
cd backend
python -m app.main  # ✅
```

**Frontend:**
```bash
cd app
npm install  # Reinstall dependencies
```

**Fix:** Always run backend from `backend/` directory using `python -m app.main`.

---

### Issue 4: TypeScript Compilation Errors

**Symptoms:**
- `Cannot redeclare exported variable 'X'`
- `Property 'X' does not exist on type 'Y'`

**Debug Steps:**
1. Check for duplicate exports:
   ```bash
   grep -n "export.*startBackend" app/src/lib/backend.ts
   ```

2. Verify TypeScript compilation:
   ```bash
   cd app
   npm run build
   ```

3. Check linter:
   ```bash
   # If available
   npm run lint
   ```

**Fix:** Remove duplicate exports, ensure single source of truth.

---

### Issue 5: CORS Errors

**Symptoms:**
- Browser console: `CORS policy: No 'Access-Control-Allow-Origin' header`
- Network tab shows OPTIONS request failing

**Debug Steps:**
1. Verify backend CORS middleware:
   ```python
   # backend/app/main.py should have:
   app.add_middleware(CORSMiddleware, 
       allow_origins=["*"], 
       allow_credentials=True, 
       allow_methods=["*"], 
       allow_headers=["*"])
   ```

2. Check backend is running and accessible:
   ```bash
   curl -v http://localhost:54388/health
   ```

**Fix:** CORS is already configured, but verify backend is running.

---

## 📋 API ENDPOINTS REFERENCE

### Backend Endpoints (`backend/app/main.py`)

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/health` | GET | Health check | None | `{"ok": true}` |
| `/api/upload` | POST | Upload files | `FormData` with `files[]` | `{"file_paths": ["/tmp/..."]}` |
| `/api/features` | POST | Extract features | `{"file_paths": [], "mode": "MFCC\|OpenL3\|CSV", "segment_length": 1.0}` | `{"rows": [...]}` |
| `/api/reduce` | POST | Dimensionality reduction | `{"method": "PCA\|t-SNE\|UMAP"}` | `{"rows": [...]}` |
| `/api/cluster` | POST | Apply clustering | `{"algorithm": "KMeans\|GMM\|HDBSCAN", "n_clusters": 3}` | `{"rows": [...], "silhouette": 0.5, "n_labels": 3}` |
| `/api/spectrogram` | POST | Generate spectrogram | `{"file_path": "...", "start_s": 0, "dur_s": 1, "fmin": 0, "fmax": 8000, "cmap": "viridis"}` | `{"png_base64": "..."}` |
| `/api/classify` | POST | Run classifier | `{"model": "RandomForest\|SVM\|DecisionTree\|GradientBoosting", "split_pct": 0.8}` | `{"accuracy": 0.95, "report": {...}, "cm": [[...]]}` |

### Frontend API Client (`app/src/lib/backend.ts`)

```typescript
// Health check and port validation
startBackend(): Promise<number>

// Upload files
uploadFiles(files: File[]): Promise<{file_paths?: string[]; error?: string}>

// Generic API call
api(path: string, init?: RequestInit): Promise<any>

// Port configuration
configureBackendPort(port: number): void
getConfiguredPort(): number
```

---

## 🔍 DEBUGGING COMMANDS

### Check Backend Status
```bash
# Health check
curl http://localhost:54388/health

# Check if process is running
ps aux | grep "python.*app.main"

# Check port binding
lsof -i :54388
```

### Check Frontend Status
```bash
# Build check
cd app
npm run build

# Type check
npx tsc --noEmit

# Check running dev server
lsof -i :5173
```

### View Logs
```bash
# Backend logs (if redirected)
tail -f /tmp/backend.log

# Frontend console (browser DevTools)
# Open browser → F12 → Console tab
```

### Kill Processes
```bash
# Kill backend
pkill -f "python.*app.main"

# Kill frontend dev server
pkill -f "vite"

# Kill specific port
lsof -ti TCP:54388 | xargs kill
```

---

## 📝 KEY FILES TO CHECK WHEN DEBUGGING

### Backend Files
- `backend/app/main.py` - FastAPI server, port configuration
- `backend/app/core/algos.py` - ML algorithms implementation
- `backend/app/core/schemas.py` - Request/response models
- `backend/requirements.txt` - Python dependencies

### Frontend Files
- `app/src/lib/backend.ts` - **CRITICAL** - Backend API client, port config
- `app/src/App.tsx` - Main React component, connection logic
- `app/src/components/ControlsPanel.tsx` - File upload, settings
- `app/package.json` - Node dependencies, scripts

### Configuration Files
- `app/vite.config.ts` - Vite build configuration
- `app/src-tauri/tauri.conf.json` - Tauri desktop app config
- `app/tsconfig.json` - TypeScript configuration

---

## ⚠️ KNOWN LIMITATIONS

1. **Backend Must Be Started Manually**
   - Frontend does NOT auto-start backend
   - Must run `python -m app.main` separately
   - Frontend only checks if backend is reachable

2. **Port Conflicts**
   - Backend tries to auto-kill port conflicts (macOS/Linux only)
   - May fail on Windows or protected processes
   - Use `SOUND_AI_PORT` env var to change port

3. **Browser vs Desktop Mode**
   - Browser mode: Limited file access, no audio playback
   - Desktop mode (Tauri): Full features, native file system access
   - Audio playback only works in desktop mode

4. **OpenL3 Feature Extraction**
   - Requires `openl3` package (not in requirements.txt)
   - Will fail if not installed
   - MFCC is recommended alternative

---

## 🎯 TYPICAL DEBUGGING WORKFLOW

1. **Check Prerequisites**
   ```bash
   python --version  # Should be 3.8+
   node --version    # Should be 16+
   ```

2. **Verify Dependencies**
   ```bash
   cd backend && pip list | grep fastapi
   cd ../app && npm list | grep react
   ```

3. **Start Backend First**
   ```bash
   cd backend
   python -m app.main
   # Wait for: "Backend listening on port 54388"
   ```

4. **Verify Backend Health**
   ```bash
   curl http://localhost:54388/health
   # Should return: {"ok":true}
   ```

5. **Start Frontend**
   ```bash
   cd app
   npm run dev -- --port 5173
   ```

6. **Check Browser Console**
   - Open `http://localhost:5173`
   - Press F12 → Console tab
   - Look for connection errors or API failures

7. **Check Network Tab**
   - F12 → Network tab
   - Verify `/health` request succeeds
   - Check API request/response payloads

---

## 📚 CONSOLIDATED FROM

This document consolidates information from:
- `README.md` - General documentation
- `README_QUICK_START.md` - Quick start guide
- `CLEANUP_SUMMARY.md` - Historical cleanup notes
- `FULL_SYSTEM_REVIEW.md` - Architecture details
- Recent code changes and fixes

**For user-facing documentation, see `README.md`**  
**For AI debugging, use this `AGENTS.md` file**

---

## 🔄 VERSION HISTORY

### December 16, 2025
- Removed duplicate `startBackend()` implementation
- Simplified backend startup to health-check only
- Backend must be started manually
- Fixed TypeScript compilation errors
- Updated port configuration documentation

### November 11, 2024
- Code cleanup and organization
- Removed duplicate files
- Added `.gitignore` files
- Fixed import issues

---

**Last Updated:** December 16, 2025  
**Maintained For:** AI agents debugging Sound AI application
