from pydantic import BaseModel
from typing import List, Optional

class FeatureRequest(BaseModel):
    file_paths: List[str]
    mode: str  # "MFCC" | "OpenL3" | "CSV"
    segment_length: float = 1.0

class ReduceRequest(BaseModel):
    method: str

class ClusterRequest(BaseModel):
    algorithm: str
    n_clusters: int = 2

class SpecRequest(BaseModel):
    file_path: str
    start_s: float
    dur_s: float
    fmin: int = 0
    fmax: int = 20000
    cmap: str = 'inferno'

class ClassifyRequest(BaseModel):
    model: str
    split_pct: int

class DataFramePayload(BaseModel):
    rows: list   # list of dicts

