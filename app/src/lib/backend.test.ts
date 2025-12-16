import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/os', () => ({
  platform: vi.fn().mockResolvedValue('linux'),
}));

vi.mock('@tauri-apps/api/fs', () => ({
  exists: vi.fn().mockResolvedValue(false),
}));

vi.mock('@tauri-apps/api/path', () => ({
  resolveResource: vi.fn(async (value: string) => value),
}));

vi.mock('@tauri-apps/api/shell', () => ({
  Command: vi.fn(),
}));

import * as backend from './backend';
import { Command } from '@tauri-apps/api/shell';

describe('createBackendCommand', () => {
  it('logs a retry message when falling back to Python', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const commandStub = { spawn: vi.fn(), stdout: { on: vi.fn() }, stderr: { on: vi.fn() }, on: vi.fn() } as any;
    (Command as unknown as vi.Mock).mockImplementation(() => commandStub);

    const result = await backend.createBackendCommand('soundai_backend');

    expect(result).toBe(commandStub);
    expect(warnSpy).toHaveBeenCalledWith('Backend binary missing, retrying with Python backend...');

    warnSpy.mockRestore();
  });
});
