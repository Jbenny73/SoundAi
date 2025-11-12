import { Command } from '@tauri-apps/api/shell';
import { platform } from '@tauri-apps/api/os';
import { resolveResource } from '@tauri-apps/api/path';

const DEFAULT_PORT = 54388;
let backendBaseUrl: string | null = null;
let startPromise: Promise<string> | null = null;

function parsePort(data: string): number | null {
  const trimmed = data.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed.port === 'number') {
      return parsed.port;
    }
  } catch (error) {
    // ignore JSON parse error, fall back to regex parsing
  }

  const match = trimmed.match(/port[\s:=]+(\d+)/i);
  if (match) {
    const maybe = Number.parseInt(match[1], 10);
    if (Number.isFinite(maybe)) {
      return maybe;
    }
  }

  const asNumber = Number.parseInt(trimmed, 10);
  if (Number.isFinite(asNumber)) {
    return asNumber;
  }

  return null;
}

async function spawnBinary(executableHint: string): Promise<Command | null> {
  if (!executableHint) return null;

  const plat = await platform();
  const isWindows = (plat as string).toLowerCase().startsWith('win');
  const extension = isWindows && !executableHint.endsWith('.exe') ? '.exe' : '';
  const attempts = [
    executableHint,
    executableHint + extension,
    `../${executableHint}`,
    `../${executableHint}${extension}`,
    `../../${executableHint}`,
    `../../${executableHint}${extension}`,
    `backend/dist/${executableHint}`,
    `backend/dist/${executableHint}${extension}`,
  ];

  for (const candidate of attempts) {
    try {
      const absolute = await resolveResource(candidate);
      return new Command(absolute);
    } catch (error) {
      try {
        return new Command(candidate);
      } catch {
        continue;
      }
    }
  }

  return null;
}

async function spawnPythonFallback(): Promise<Command> {
  const scriptCandidates = [
    'backend/app/main.py',
    '../backend/app/main.py',
    '../../backend/app/main.py',
  ];
  const cwdCandidates = ['backend', '../backend', '../../backend'];
  const pythonExecutables = ['python3', 'python'];

  let lastError: unknown = null;

  for (const cwd of cwdCandidates) {
    for (const py of pythonExecutables) {
      try {
        const resolvedCwd = await resolveResource(cwd);
        return new Command(py, ['-m', 'app.main'], { cwd: resolvedCwd });
      } catch (error) {
        try {
          return new Command(py, ['-m', 'app.main'], { cwd });
        } catch (directError) {
          lastError = directError;
        }
      }
    }
  }

  for (const script of scriptCandidates) {
    for (const py of pythonExecutables) {
      try {
        const resolvedScript = await resolveResource(script);
        return new Command(py, [resolvedScript]);
      } catch (error) {
        try {
          return new Command(py, [script]);
        } catch (directError) {
          lastError = directError;
        }
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to start Python backend');
}

async function ensureBackend(executableHint: string): Promise<string> {
  if (backendBaseUrl) {
    return backendBaseUrl;
  }

  if (startPromise) {
    return startPromise;
  }

  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    backendBaseUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
    return backendBaseUrl;
  }

  startPromise = new Promise<string>(async (resolve, reject) => {
    try {
      const command = (await spawnBinary(executableHint)) ?? (await spawnPythonFallback());

      let resolved = false;

      command.stdout.on('data', (event: string) => {
        const port = parsePort(event);
        if (port) {
          backendBaseUrl = `http://127.0.0.1:${port}`;
          if (!resolved) {
            resolved = true;
            resolve(backendBaseUrl);
          }
        }
      });

      command.stderr.on('data', (event: string) => {
        console.error('[backend]', event);
      });

      command.on('close', () => {
        backendBaseUrl = null;
        startPromise = null;
      });

      await command.spawn();

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          backendBaseUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
          resolve(backendBaseUrl);
        }
      }, 3000);
    } catch (error) {
      startPromise = null;
      reject(error);
    }
  });

  return startPromise;
}

export async function startBackend(executableHint: string): Promise<string> {
  return ensureBackend(executableHint);
}

export async function api(path: string, init?: RequestInit) {
  if (!backendBaseUrl) {
    await ensureBackend('../backend/dist/soundai_backend');
  }

  const base = backendBaseUrl ?? `http://127.0.0.1:${DEFAULT_PORT}`;
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const response = await fetch(url, init);
    const contentType = response.headers.get('content-type');
    let payload: any = null;
    if (contentType?.includes('application/json')) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    if (!response.ok) {
      return { error: payload?.error ?? response.statusText };
    }

    return payload;
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
