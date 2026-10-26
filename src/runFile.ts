import { execFile } from 'child_process';

export interface RunResult {
  stdout: string;
  stderr: string;
}

const trimFinalNewline = (s: string) => s.replace(/\r?\n$/, '');

/**
 * Runs a program directly (no shell) and collects its output, like the
 * execa calls this replaces: resolves with stdout and stderr (final newline
 * trimmed) and rejects when the program exits with an error, with stderr in
 * the error message.
 */
export function runFile(file: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { maxBuffer: 256 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        const out = trimFinalNewline(String(stdout ?? ''));
        const err = trimFinalNewline(String(stderr ?? ''));
        if (error) {
          reject(new Error(`Command failed: ${file}\n${err || error.message}`));
          return;
        }
        resolve({ stdout: out, stderr: err });
      }
    );
  });
}
