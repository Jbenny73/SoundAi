const BASE = 'http://127.0.0.1:8000';

async function ping(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok;
  } catch (error) {
    console.warn('Backend not reachable:', error);
    return false;
  }
}

export async function startBackend(): Promise<void> {
  const healthy = await ping();
  if (!healthy) {
    throw new Error(
      `Backend not reachable at ${BASE}. Start it with \"python -m app.main\" from the backend directory.`
    );
  }
}

export async function uploadFiles(files: File[]): Promise<{ file_paths?: string[]; error?: string }> {
  if (!files.length) {
    return { error: 'No files provided' };
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file, file.name);
  }

  try {
    const response = await fetch(`${BASE}/api/upload`, { method: 'POST', body: formData });
    const payload = await response.json();
    if (!response.ok) {
      return { error: payload?.error ?? 'Upload failed' };
    }
    return payload;
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function api(path: string, init?: RequestInit) {
  const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const response = await fetch(url, init);
    const contentType = response.headers.get('content-type');
    const payload = contentType?.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      return { error: payload?.error ?? response.statusText };
    }

    return payload;
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
