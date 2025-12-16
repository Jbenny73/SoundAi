import { exists } from '@tauri-apps/api/fs';
import { Command } from '@tauri-apps/api/shell';
import { platform } from '@tauri-apps/api/os';
import { resolveResource } from '@tauri-apps/api/path';

export const DEFAULT_PORT = 54388;

let backendBaseUrl: string | null = null;
let startPromise: Promise<string> | null = null;
let configuredPort = DEFAULT_PORT;

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

export async function spawnBinary(executableHint: string): Promise<Command | null> {
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

  const resolveCandidate = async (candidate: string): Promise<string | null> => {
    try {
      const absolute = await resolveResource(candidate);
      if (await exists(absolute)) {
        return absolute;
      }
    } catch {
      // ignore resolution errors and try the raw candidate
    }

    if (await exists(candidate)) {
      return candidate;
    }

    return null;
  };

  for (const candidate of attempts) {
    const resolved = await resolveCandidate(candidate);
    if (!resolved) continue;

    try {
      return new Command(resolved);
    } catch {
      // try next candidate
    }
  }

  return null;
}

export async function spawnPythonFallback(): Promise<Command> {
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

export async function createBackendCommand(executableHint: string): Promise<Command> {
  const binary = await spawnBinary(executableHint);
  if (binary) return binary;

  console.warn('Backend binary missing, retrying with Python backend...');
  return spawnPythonFallback();
}

async function ensureBackend(executableHint: string): Promise<string> {
  if (backendBaseUrl) {
    return backendBaseUrl;
  }

  if (startPromise) {
    return startPromise;
  }

  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    backendBaseUrl = `http://127.0.0.1:${configuredPort}`;
    return backendBaseUrl;
  }

  startPromise = new Promise<string>(async (resolve, reject) => {
    try {
      const command = await createBackendCommand(executableHint);

      let resolved = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      command.stdout.on('data', (event: string) => {
        const port = parsePort(event);
        if (port) {
          if (timeout) {
            clearTimeout(timeout);
          }
          configuredPort = port;
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
        if (timeout) {
          clearTimeout(timeout);
        }
        if (!resolved) {
          resolved = true;
          reject(new Error('Backend process exited before reporting a port'));
        }
      });

      await command.spawn();

      timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          backendBaseUrl = `http://127.0.0.1:${configuredPort}`;
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

export function configureBackendPort(port: number) {
  configuredPort = port;
  backendBaseUrl = null;
  startPromise = null;
}

export function getConfiguredPort() {
  return configuredPort;
}

async function isHealthy(base: string) {
  try {
    const response = await fetch(`${base}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function startBackend(
  executableHint = '../backend/dist/soundai_backend',
): Promise<number> {
  const base = `http://127.0.0.1:${configuredPort}`;

  if (await isHealthy(base)) {
    backendBaseUrl = base;
    return configuredPort;
  }

  const url = await ensureBackend(executableHint);
  const port = Number.parseInt(new URL(url).port, 10);
  if (Number.isFinite(port)) {
    configuredPort = port;
  }

  return configuredPort;
}

export async function api(path: string, init?: RequestInit) {
  if (!backendBaseUrl) {
    await ensureBackend('../backend/dist/soundai_backend');
  }

  const base = backendBaseUrl ?? `http://127.0.0.1:${configuredPort}`;
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

export const __test__ = {
  parsePort,
  isHealthy,
};
