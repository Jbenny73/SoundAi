# 🎵 How to Use the Audio Labeling & Classification Tool

## ✅ Current Setup

Your app is now running with the MLPanel **visible at the bottom of the screen**!

**Access it at:** `http://localhost:1420`

## 📐 New Layout

```
┌─────────────┬───────────────────────────┐
│             │                           │
│  Controls   │    Scatter Plot          │
│  Panel      │    (Data Visualization)  │
│             │                           │
│             ├───────────────────────────┤
│             │                           │
│             │  🎵 AUDIO LABELING TOOL   │
│             │  (This is the MLPanel!)   │
│             │                           │
└─────────────┴───────────────────────────┘
```

## 🎯 What You Should See NOW

**Bottom Section** (MLPanel) with a **BLUE BORDER** and **BLUE HEADER** that says:
### 🎵 Audio Labeling & Classification Tool

Inside you'll find **3 white cards**:
1. **Classification & Export** (left - blue header)
2. **Spectrogram & Label Editor** (center - yellow header)
3. **Segments** (right - green header)

## 📋 How to Use It

### Step 1: Load Your Data
You already have 14 points loaded! ✅

### Step 2: Click on Points in the Scatter Plot
- Click points in the scatter plot at the top
- Selected point spectrograms will appear at the top of the MLPanel
- **Look for**: "📊 Selected Points Spectrograms"

### Step 3: Browse and Label Segments

In the **Segments panel** (right side, green header):
- You'll see all 14 segments listed
- Each shows: filename, time, and current label
- **Click any segment** to:
  - Load its spectrogram in the center
  - Play the audio
  - Edit its label

### Step 4: Play Audio & Edit Labels

Once you click a segment:

**Center Panel** will show:
- **Audio controls**: ⏮ Prev | ▶ Play/Pause | Next ⏭
- **Spectrogram** of the selected segment
- **Label Editor**:
  - Input field to type a number (e.g., 0, 1, 2, 3)
  - Click "Update" or press Enter to save
  - Shows current label status

### Step 5: Run Classification (Optional)

**Left Panel**:
- Choose model (Random Forest, Decision Tree, etc.)
- Set train/test split percentage
- Click "Run Classification" 
- View accuracy and results

### Step 6: Export Your Labels

**Big Green Button**:
- Click "📥 Export Labels to CSV"
- Downloads file: `labeled_data_YYYY-MM-DD.csv`
- Contains all segments with their labels

## 🚀 Quick Start Workflow

1. **Click a segment** in the right panel (green card)
2. **Listen** to the audio using Play button
3. **View** the spectrogram in the center
4. **Type a label** (e.g., "0" for background, "1" for bird call)
5. **Press Enter** or click Update
6. **Navigate** with Prev/Next buttons to label more
7. **Export** when done!

## 🎨 Visual Cues

- **Blue border** = You're looking at the MLPanel
- **Blue header** = Main tool title
- **Colored section headers** = Different functional areas
- **White cards** = Individual panels
- **Highlighted segment** = Currently selected (blue background)

## 🐛 Troubleshooting

**Don't see the MLPanel?**
- Make sure you're at `http://localhost:1420`
- Look at the **bottom half** of your screen
- Look for the thick **BLUE BORDER**
- You may need to refresh the page (F5 or Cmd+R)

**No segments showing?**
- The right panel will show "No data loaded yet" if empty
- But you have 14 points, so you should see 14 segments!

**Audio not playing?**
- This works best in Tauri desktop mode
- In browser mode, check the console for warnings

## 💡 Tips

- **Label as you go**: Listen, label, next, repeat
- **Use consistent labels**: 0=background, 1=bird1, 2=bird2, etc.
- **Export frequently**: Save your work as you label
- **Select multiple points**: Click points on scatter plot to see multiple spectrograms

---

**Ready to start labeling? Click any segment in the right panel!** 🎵


