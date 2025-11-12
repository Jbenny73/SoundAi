# -*- coding: utf-8 -*-
import io, os, json, base64, threading, time
import numpy as np
import pandas as pd
import soundfile as sf
import librosa
# import openl3  # Temporarily disabled due to installation issues
from scipy.signal import spectrogram
from sklearn.metrics import silhouette_score, classification_report, accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC

# ==== Your helpers (lightly adapted) ====

def reduce_dim(features: pd.DataFrame, method="PCA", n_components=2):
    from sklearn.decomposition import PCA
    from sklearn.manifold import TSNE
    import umap.umap_ as umap
    
    if features.empty:
        raise ValueError("Cannot reduce dimensions: feature dataframe is empty")
    
    features_copy = features.copy()
    special_cols = ['second', 'file_name']
    if 'label' in features_copy.columns:
        special_cols.append('label')
    feature_columns = [c for c in features_copy.columns if c not in special_cols]
    
    if not feature_columns:
        raise ValueError("No feature columns found for dimensionality reduction")
    
    if len(features_copy) < n_components:
        raise ValueError(f"Insufficient data: need at least {n_components} samples for {n_components}D reduction, got {len(features_copy)}")
    
    if method == "PCA":
        reducer = PCA(n_components=n_components)
    elif method == "t-SNE":
        perp = min(30, max(5, len(features_copy) - 1))
        reducer = TSNE(n_components=n_components, random_state=42, perplexity=perp)
    elif method == "UMAP":
        reducer = umap.UMAP(n_components=n_components, random_state=42)
    else:
        raise ValueError("Invalid dimensionality reduction method.")
    reduced = reducer.fit_transform(features_copy[feature_columns])
    df_reduced = pd.DataFrame(reduced, columns=['x', 'y'])
    for col in special_cols:
        if col in features_copy.columns:
            df_reduced[col] = features_copy[col].values
    return df_reduced


def apply_clustering(features: pd.DataFrame, algorithm="KMeans", n_clusters=2):
    from sklearn.cluster import KMeans
    from sklearn.mixture import GaussianMixture
    import hdbscan
    
    if features.empty:
        raise ValueError("Cannot cluster: feature dataframe is empty")
    
    if 'x' not in features.columns or 'y' not in features.columns:
        raise ValueError("Cannot cluster: 'x' and 'y' columns not found. Run dimensionality reduction first.")
    
    cluster_data = features[['x','y']]
    
    if len(cluster_data) < n_clusters and algorithm in ["KMeans", "GMM"]:
        raise ValueError(f"Insufficient data: need at least {n_clusters} samples for {algorithm} with {n_clusters} clusters, got {len(cluster_data)}")
    
    if algorithm == "KMeans":
        model = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
        labels = model.fit_predict(cluster_data)
    elif algorithm == "GMM":
        model = GaussianMixture(n_components=n_clusters, random_state=42)
        labels = model.fit_predict(cluster_data)
    elif algorithm == "HDBSCAN":
        model = hdbscan.HDBSCAN(min_cluster_size=3)
        labels = model.fit_predict(cluster_data)
    else:
        raise ValueError("Invalid clustering algorithm.")
    uniq = np.unique(labels)
    s = silhouette_score(cluster_data, labels) if (len(uniq) > 1 and len(uniq) < len(labels)) else 0.0
    return labels.tolist(), float(s), int(len(uniq))


def extract_mfcc(audio_file, sr=22050, n_mfcc=13, segment_length=1.0):
    if not (0.1 <= segment_length <= 60.0):
        segment_length = 1.0
    y, sr = librosa.load(audio_file, sr=sr)
    duration = librosa.get_duration(y=y, sr=sr)
    mfccs, start_times = [], []
    t = 0.0
    hop = int(segment_length * sr)
    while t + segment_length <= duration:
        s0 = int(t*sr)
        s1 = s0 + hop
        # Ensure we don't exceed array bounds
        if s1 > len(y):
            break
        seg = y[s0:s1]
        if len(seg) == hop:
            m = librosa.feature.mfcc(y=seg, sr=sr, n_mfcc=n_mfcc)
            mfccs.append(np.mean(m, axis=1))
            start_times.append(t)
        t += segment_length
    if not mfccs:
        raise ValueError(f"Audio file too short or invalid. No segments extracted with segment_length={segment_length}s")
    df = pd.DataFrame(mfccs, columns=[f"mfcc_{i+1}" for i in range(n_mfcc)])
    df["second"] = start_times
    return df


def extract_openl3(audio_file, segment_length=1.0):
    # Temporarily disabled - using MFCC as fallback
    return extract_mfcc(audio_file, segment_length=segment_length)


def make_spectrogram_png(audio_file: str, start_s: float, dur_s: float, fmin: int = 0, fmax: int = 20000, cmap='inferno') -> str:
    """Return base64 PNG of a spectrogram segment."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    audio, sr = sf.read(audio_file)
    # Convert to mono first, before calculating sample indices
    if audio.ndim > 1:
        audio = audio[:, 0]
    s0 = int(start_s*sr)
    s1 = min(s0 + int(dur_s*sr), len(audio))
    seg = audio[s0:s1]
    if len(seg) < 256:
        raise ValueError(f"Segment too short ({len(seg)} samples). Need at least 256 samples for spectrogram.")
    nperseg = min(len(seg), 2048, max(256, int(sr*dur_s//4)))
    noverlap = nperseg//2
    f, t, Sxx = spectrogram(seg, fs=sr, nperseg=nperseg, noverlap=noverlap)
    mask = (f >= fmin) & (f <= fmax)
    f, Sxx = f[mask], Sxx[mask,:]
    fig, ax = plt.subplots(figsize=(5,3), dpi=120)
    ax.pcolormesh(t, f, 10*np.log10(Sxx + 1e-10), shading='auto', cmap=cmap)
    ax.set_xlabel('Time (s)'); ax.set_ylabel('Freq (Hz)'); ax.set_ylim(fmin, fmax)
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png'); plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('ascii')


def run_classifier(reduced_df: pd.DataFrame, model_choice: str, split_pct: int):
    if 'label' not in reduced_df.columns:
        raise ValueError('features are not labeled')
    X = reduced_df[[c for c in reduced_df.columns if c not in ['second','file_name','label']]]
    y = reduced_df['label'].astype(int).values
    if len(np.unique(y)) < 2:
        raise ValueError('less than 2 unique labels')
    test_size = 1 - (split_pct/100.0)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=test_size, random_state=42, stratify=y)
    model = None
    if model_choice == 'Random Forest':
        model = RandomForestClassifier(random_state=42)
    elif model_choice == 'Decision Tree':
        model = DecisionTreeClassifier(random_state=42)
    elif model_choice == 'Gradient Boosting':
        model = GradientBoostingClassifier(random_state=42)
    elif model_choice == 'Linear SVM':
        model = SVC(kernel='linear', random_state=42)
    elif model_choice == 'Voting Classifier':
        est = [
            ('rf', RandomForestClassifier(random_state=42)),
            ('dt', DecisionTreeClassifier(random_state=42)),
            ('svm', SVC(kernel='linear', random_state=42, probability=True))
        ]
        model = VotingClassifier(estimators=est, voting='soft')
    else:
        raise ValueError('Unknown model')
    model.fit(Xtr, ytr)
    yp = model.predict(Xte)
    acc = float(accuracy_score(yte, yp))
    rep = classification_report(yte, yp)
    cm = confusion_matrix(yte, yp).tolist()
    return acc, rep, cm
