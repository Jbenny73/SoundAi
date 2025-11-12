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

