import { spawn } from 'child_process';
import path from 'path';

const RUST_CORE_TIMEOUT_MS = 15000;

function getWorkspaceRoot(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

function resolveRustBinaryPath(): string {
  if (process.env.RUST_CORE_BINARY) {
    return process.env.RUST_CORE_BINARY;
  }

  const binaryName = process.platform === 'win32' ? 'karma_yoga_core.exe' : 'karma_yoga_core';
  return path.join(getWorkspaceRoot(), 'rust-core', 'target', 'release', binaryName);
}

export async function runRustAnalytics(payload: unknown): Promise<unknown> {
  const binaryPath = resolveRustBinaryPath();

  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, [], {
      cwd: path.join(getWorkspaceRoot(), 'rust-core'),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Rust core analytics timed out.'));
    }, RUST_CORE_TIMEOUT_MS);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });

    child.on('error', error => {
      clearTimeout(timer);
      reject(new Error(`Rust core process failed to start: ${error.message}`));
    });

    child.on('close', code => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(`Rust core exited with code ${code}. ${stderr.trim()}`.trim()));
        return;
      }

      try {
        const parsed = stdout.trim() ? JSON.parse(stdout) : null;
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Rust core returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
      }
    });

    const body = JSON.stringify(payload);
    child.stdin.write(body);
    child.stdin.end();
  });
}