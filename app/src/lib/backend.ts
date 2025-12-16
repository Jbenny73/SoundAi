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
export const DEFAULT_PORT = 54388;
let currentPort = DEFAULT_PORT;
let BASE = `http://127.0.0.1:${DEFAULT_PORT}`; // Default backend port for dev mode

export function configureBackendPort(port: number) {
  currentPort = port;
  BASE = `http://127.0.0.1:${port}`;
}

export function getConfiguredPort() {
  return currentPort;
}

export async function startBackend() {
  // Ensure BASE aligns with the currently configured port
  configureBackendPort(currentPort);

  // First, check if backend is already running on the configured port
  try {
    const response = await fetch(`${BASE}/health`);
    if (response.ok) {
      console.log(`Backend already running on port ${currentPort}`);
      return currentPort;
    }
  } catch (e) {
    console.log(`Backend not found on port ${currentPort}, attempting to start...`);
  }

  // Check if running in Tauri
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      // Dynamically import Tauri API only when needed
      const { Command } = await import('@tauri-apps/api/shell');

      async function spawnPython(commandName: string) {
        const cmd = new Command(commandName, ['app/main.py'], {
          cwd: '../backend',
          env: {
            SOUND_AI_PORT: String(currentPort),
            PYTHONPATH: '.',
          },
        });

        const port = await new Promise<number>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Backend startup timeout - no port received after 30 seconds'));
          }, 30000);

          cmd.stdout.on('data', (line) => {
            try {
              const o = JSON.parse(line);
              if (o.port) {
                clearTimeout(timeout);
                configureBackendPort(o.port);
                resolve(o.port);
              }
            } catch {
              console.debug('Backend STDOUT:', line);
            }
          });

          cmd.stderr.on('data', (line) => {
            console.error('Backend STDERR:', line);
          });

          cmd.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });

          cmd.spawn().catch((err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        return port;
      }

      try {
        return await spawnPython('python3');
      } catch (primaryError) {
        console.warn('python3 command failed, retrying with python:', primaryError);
        return await spawnPython('python');
      }
    } catch (err) {
      console.error('Failed to start backend via Tauri:', err);
      // Fall back to assuming backend is on the default port
      return currentPort;
    }
  } else {
    // Running in dev mode, backend should already be running
    console.log('Running in dev mode, using backend at:', BASE);
    return currentPort;
  }
}

export async function api<T=any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API request failed (${res.status}): ${text}`);
  }
  return res.json();
}

